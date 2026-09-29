import Foundation

/// Client for Joplin Cloud's sync API (the "JoplinServer" protocol — Joplin Cloud is
/// just a hosted instance of Joplin Server). Phase 1 only needs login; item sync
/// (api/items, api/batch_items, delta cursor) is a later phase.
///
/// Protocol reference: packages/lib/JoplinServerApi.ts in this repo's Joplin monorepo.
enum JoplinCloudApi {

    private static let baseURL = URL(string: "https://api.joplincloud.com")!

    // Real Joplin clients send this on every request (see JoplinServerApi.ts's
    // exec_() — "Need server 2.6 for new lock support"). We don't do sync locks,
    // but the server may use this header to decide how much of its newer
    // processing (e.g. change-log registration for delta) to apply, so send it
    // too rather than looking like a legacy/unversioned client.
    private static let session: URLSession = {
        let config = URLSessionConfiguration.default
        config.httpAdditionalHeaders = ["X-API-MIN-VERSION": "2.6.0"]
        return URLSession(configuration: config)
    }()

    struct LoginResult {
        let sessionId: String
        let userId: String
    }

    enum LoginError: Error, LocalizedError {
        case invalidCredentials
        case other(String)
        case network(Error)

        var errorDescription: String? {
            switch self {
            case .invalidCredentials: return "Incorrect email or password."
            case .other(let message): return message
            case .network: return "The server didn’t respond. Check your connection, then try again."
            }
        }
    }

    private struct LoginRequestBody: Encodable {
        let email: String
        let password: String
    }

    private struct SessionResponse: Decodable {
        let id: String
        let userId: String

        enum CodingKeys: String, CodingKey {
            case id
            case userId = "user_id"
        }
    }

    private struct ErrorResponse: Decodable {
        let error: String?
        let message: String?
    }

    /// POST api/sessions — email/password login, returns a session id used as the
    /// X-API-AUTH header on every later sync request.
    static func login(email: String, password: String) async -> Result<LoginResult, LoginError> {
        var request = URLRequest(url: baseURL.appendingPathComponent("api/sessions"))
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try? JSONEncoder().encode(LoginRequestBody(email: email, password: password))

        do {
            let (data, response) = try await session.data(for: request)
            guard let httpResponse = response as? HTTPURLResponse else {
                return .failure(.other("Unexpected response from server."))
            }

            if httpResponse.statusCode == 200 || httpResponse.statusCode == 201 {
                let session = try JSONDecoder().decode(SessionResponse.self, from: data)
                return .success(LoginResult(sessionId: session.id, userId: session.userId))
            } else if httpResponse.statusCode == 401 || httpResponse.statusCode == 403 {
                return .failure(.invalidCredentials)
            } else {
                let errorBody = try? JSONDecoder().decode(ErrorResponse.self, from: data)
                let message = errorBody?.message ?? errorBody?.error ?? "Login failed (HTTP \(httpResponse.statusCode))"
                return .failure(.other(message))
            }
        } catch {
            return .failure(.network(error))
        }
    }

    // MARK: - Sync (Phase 2, pull-only)

    struct DeltaChange: Decodable {
        let id: String
        // The item's filename, e.g. "<32-char-id>.md" — this, not `id`/`item_id` (the
        // server's internal change-log row id), is what content fetches are keyed on.
        let itemName: String?
        // Numeric ChangeType from Joplin's source: 1 = create, 2 = update, 3 = delete.
        let type: Int

        enum CodingKeys: String, CodingKey {
            case id
            case itemName = "item_name"
            case type
        }

        init(from decoder: Decoder) throws {
            let container = try decoder.container(keyedBy: CodingKeys.self)
            id = try container.decode(String.self, forKey: .id)
            itemName = try container.decodeIfPresent(String.self, forKey: .itemName)
            type = try container.decodeIfPresent(Int.self, forKey: .type) ?? 1
        }
    }

    struct DeltaResponse: Decodable {
        let items: [DeltaChange]
        let hasMore: Bool
        let cursor: String?

        enum CodingKeys: String, CodingKey {
            case items
            case hasMore = "has_more"
            case cursor
        }
    }

    enum SyncApiError: Error, LocalizedError {
        case unauthorized
        case other(String)
        case network(Error)

        var errorDescription: String? {
            switch self {
            case .unauthorized: return "Your Joplin Cloud session expired. Log in again to keep syncing."
            case .other(let message): return message
            case .network: return "The server didn’t respond. Check your connection, then try again."
            }
        }
    }

    /// GET api/items/root:/:/delta — root:/:/  is the literal sentinel for "account
    /// root" per file-api-driver-joplinServer.ts. Paginate with the returned cursor
    /// until hasMore is false.
    static func delta(sessionId: String, cursor: String?) async -> Result<DeltaResponse, SyncApiError> {
        var urlString = baseURL.appendingPathComponent("api/items/root:/:/delta").absoluteString
        if let cursor { urlString += "?cursor=\(cursor)" }
        return await authorizedGet(urlString: urlString, sessionId: sessionId) { data in
            try JSONDecoder().decode(DeltaResponse.self, from: data)
        }
    }

    /// GET api/items/root:/{itemName}:/content — raw serialized item text (title,
    /// body, metadata footer — see JoplinItemParser).
    static func itemContent(sessionId: String, itemName: String) async -> Result<String, SyncApiError> {
        let urlString = baseURL.appendingPathComponent("api/items/root:/\(itemName):/content").absoluteString
        return await authorizedGet(urlString: urlString, sessionId: sessionId) { data in
            String(data: data, encoding: .utf8) ?? ""
        }
    }

    /// GET api/items/root:/.resource/{resourceId}:/content — the resource's raw binary
    /// blob, stored as a separate item from its `{resourceId}.md` metadata (see
    /// Dirnames.Resources / resourceRemotePath() in packages/lib).
    static func resourceBlob(sessionId: String, resourceId: String) async -> Result<Data, SyncApiError> {
        let urlString = baseURL.appendingPathComponent("api/items/root:/.resource/\(resourceId):/content").absoluteString
        return await authorizedGet(urlString: urlString, sessionId: sessionId) { data in data }
    }

    /// PUT api/items/root:/{itemName}:/content — creates OR updates an item; Joplin
    /// Server has no separate create call, a PUT at this path upserts whatever's there.
    static func putItemContent(sessionId: String, itemName: String, content: Data) async -> Result<Void, SyncApiError> {
        let urlString = baseURL.appendingPathComponent("api/items/root:/\(itemName):/content").absoluteString
        guard let url = URL(string: urlString) else { return .failure(.other("Invalid URL: \(urlString)")) }
        var request = URLRequest(url: url)
        request.httpMethod = "PUT"
        request.setValue(sessionId, forHTTPHeaderField: "X-API-AUTH")
        request.setValue("application/octet-stream", forHTTPHeaderField: "Content-Type")
        request.httpBody = content
        return await executeForResult(request, urlString: urlString)
    }

    /// PUT api/items/root:/.resource/{resourceId}:/content — uploads a resource's raw
    /// binary blob, the counterpart to resourceBlob()'s GET. Separate path from the
    /// resource's own `{resourceId}.md` metadata item (pushed via putItemContent).
    static func putResourceBlob(sessionId: String, resourceId: String, content: Data) async -> Result<Void, SyncApiError> {
        let urlString = baseURL.appendingPathComponent("api/items/root:/.resource/\(resourceId):/content").absoluteString
        guard let url = URL(string: urlString) else { return .failure(.other("Invalid URL: \(urlString)")) }
        var request = URLRequest(url: url)
        request.httpMethod = "PUT"
        request.setValue(sessionId, forHTTPHeaderField: "X-API-AUTH")
        request.setValue("application/octet-stream", forHTTPHeaderField: "Content-Type")
        request.httpBody = content
        return await executeForResult(request, urlString: urlString)
    }

    /// DELETE api/items/root:/{itemName}: — no `/content` suffix, unlike get/put.
    static func deleteItem(sessionId: String, itemName: String) async -> Result<Void, SyncApiError> {
        let urlString = baseURL.appendingPathComponent("api/items/root:/\(itemName):").absoluteString
        guard let url = URL(string: urlString) else { return .failure(.other("Invalid URL: \(urlString)")) }
        var request = URLRequest(url: url)
        request.httpMethod = "DELETE"
        request.setValue(sessionId, forHTTPHeaderField: "X-API-AUTH")
        return await executeForResult(request, urlString: urlString)
    }

    private static func executeForResult(_ request: URLRequest, urlString: String) async -> Result<Void, SyncApiError> {
        do {
            let (_, response) = try await session.data(for: request)
            guard let httpResponse = response as? HTTPURLResponse else {
                return .failure(.other("Unexpected response from server."))
            }
            if httpResponse.statusCode == 401 || httpResponse.statusCode == 403 {
                return .failure(.unauthorized)
            }
            // A delete for an item that's already gone (e.g. retried after a previous
            // run succeeded but the local "pending delete" wasn't cleared) is not an
            // error — treat 404 as success too.
            guard (200...299).contains(httpResponse.statusCode) || httpResponse.statusCode == 404 else {
                return .failure(.other("Request failed (HTTP \(httpResponse.statusCode)): \(urlString)"))
            }
            return .success(())
        } catch {
            return .failure(.network(error))
        }
    }

    private static func authorizedGet<T>(
        urlString: String,
        sessionId: String,
        parse: (Data) throws -> T
    ) async -> Result<T, SyncApiError> {
        guard let url = URL(string: urlString) else { return .failure(.other("Invalid URL: \(urlString)")) }
        var request = URLRequest(url: url)
        request.setValue(sessionId, forHTTPHeaderField: "X-API-AUTH")

        do {
            let (data, response) = try await session.data(for: request)
            guard let httpResponse = response as? HTTPURLResponse else {
                return .failure(.other("Unexpected response from server."))
            }
            if httpResponse.statusCode == 401 || httpResponse.statusCode == 403 {
                return .failure(.unauthorized)
            }
            guard (200...299).contains(httpResponse.statusCode) else {
                return .failure(.other("Request failed (HTTP \(httpResponse.statusCode)): \(urlString)"))
            }
            do {
                return .success(try parse(data))
            } catch {
                return .failure(.other("Failed to parse response: \(error.localizedDescription)"))
            }
        } catch {
            return .failure(.network(error))
        }
    }
}
