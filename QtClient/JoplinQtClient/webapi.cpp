#include <stable.h>

#include "webapi.h"

using namespace jop;

WebApi::WebApi(const QString &baseUrl) {
	baseUrl_ = baseUrl;
	sessionId_ = "";
	connect(&manager_, SIGNAL(finished(QNetworkReply*)), this, SLOT(request_finished(QNetworkReply*)));
}

QString WebApi::baseUrl() const {
	return baseUrl_;
}

void WebApi::execRequest(HttpMethod method, const QString &path, const QUrlQuery &query, const QUrlQuery &data, const QString& tag) {
	QueuedRequest r;
	r.method = method;
	r.path = path;
	r.query = query;
	r.data = data;
	r.tag = tag;
	r.buffer = NULL;
	queuedRequests_ << r;

	processQueue();
}

void WebApi::post(const QString& path,const QUrlQuery& query, const QUrlQuery& data, const QString& tag) { execRequest(HttpMethod::POST, path, query, data, tag); }
void WebApi::get(const QString& path,const QUrlQuery& query, const QUrlQuery& data, const QString& tag) { execRequest(HttpMethod::GET, path, query, data, tag); }
void WebApi::put(const QString& path,const QUrlQuery& query, const QUrlQuery& data, const QString& tag) { execRequest(HttpMethod::PUT, path, query, data, tag); }
void WebApi::del(const QString &path, const QUrlQuery &query, const QUrlQuery &data, const QString &tag) { execRequest(HttpMethod::DEL, path, query, data, tag); }
void WebApi::patch(const QString &path, const QUrlQuery &query, const QUrlQuery &data, const QString &tag) { execRequest(HttpMethod::PATCH, path, query, data, tag); }

void WebApi::setSessionId(const QString &v) {
	sessionId_ = v;
}

void WebApi::processQueue() {
	if (!queuedRequests_.size() || inProgressRequests_.size() >= 50) return;
	QueuedRequest& r = queuedRequests_.takeFirst();

	QString url = baseUrl_ + "/" + r.path;
	QUrlQuery query = r.query;

	if (sessionId_ != "") {
		query.addQueryItem("session", sessionId_);
	}

	url += "?" + query.toString(QUrl::FullyEncoded);

	QNetworkRequest* request = new QNetworkRequest(url);
	request->setHeader(QNetworkRequest::ContentTypeHeader, "application/x-www-form-urlencoded");

	QNetworkReply* reply = NULL;

	if (r.method == jop::PATCH) {
		// TODO: Delete buffer when done
		QBuffer* buffer = new QBuffer();
		buffer->open(QBuffer::ReadWrite);
		buffer->write(r.data.toString(QUrl::FullyEncoded).toUtf8());
		buffer->seek(0);
		r.buffer = buffer;
		reply = manager_.sendCustomRequest(*request, "PATCH", buffer);
	}

	if (r.method == jop::GET) {
	   reply = manager_.get(*request);
	}

	if (r.method == jop::POST) {
		reply = manager_.post(*request, r.data.toString(QUrl::FullyEncoded).toUtf8());
	}

	if (r.method == jop::PUT) {
		reply = manager_.put(*request, r.data.toString(QUrl::FullyEncoded).toUtf8());
	}

	if (r.method == jop::DEL) {
		reply = manager_.deleteResource(*request);
	}

	if (!reply) {
		qWarning() << "WebApi::processQueue(): reply object was not created - invalid request method";
		return;
	}

	r.reply = reply;
	r.request = request;
	connect(reply, SIGNAL(error(QNetworkReply::NetworkError)), this, SLOT(request_error(QNetworkReply::NetworkError)));

	QStringList cmd;
	cmd << "curl";
	if (r.method == jop::PUT) cmd << "-X" << "PUT";
	if (r.method == jop::PATCH) cmd << "-X" << "PATCH";
	if (r.method == jop::DEL) cmd << "-X" << "DELETE";

	if (r.method != jop::GET && r.method != jop::DEL) {
		cmd << "--data" << "'" + r.data.toString(QUrl::FullyEncoded) + "'";
	}
	cmd << "'" + url + "'";

	qDebug().noquote() << cmd.join(" ");

	inProgressRequests_.push_back(r);
}

void WebApi::request_finished(QNetworkReply *reply) {
	QByteArray responseBodyBA = reply->readAll();
	QJsonObject response;
	QJsonParseError err;
	QJsonDocument doc = QJsonDocument::fromJson(responseBodyBA, &err);
	if (err.error != QJsonParseError::NoError) {
		qWarning() << "Could not parse JSON:" << err.errorString();
		qWarning().noquote() << QString(responseBodyBA);
	} else {
		response = doc.object();
		if (response.contains("error") && !response["error"].isNull()) {
			qWarning().noquote() << "API error:" << QString(responseBodyBA);
		}
	}

	for (int i = 0; i < inProgressRequests_.size(); i++) {
		QueuedRequest r = inProgressRequests_[i];
		if (r.reply == reply) {
			inProgressRequests_.erase(inProgressRequests_.begin() + i);
			emit requestDone(response, r.tag);
			break;
		}
	}

	processQueue();
}

void WebApi::request_error(QNetworkReply::NetworkError e) {
	qDebug() << "Network error" << e;
}
