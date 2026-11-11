import XCTest


extension XCUIElement {
	// XCUITest only retries finding an element for a few seconds, which isn't always enough on CI.
	func waitThenTap(_ description: String, timeout: TimeInterval = 30.0) {
		if !waitForExistence(timeout: timeout) {
			XCTFail("Failed to find \(description)")
		}
		tap()
	}
}

final class JoplinUITests: XCTestCase {

	override func setUpWithError() throws {
		continueAfterFailure = false
	}

	override func tearDownWithError() throws {
	}

	@MainActor
	func testCreateNote() throws {
		let app = XCUIApplication()
		app.launch()
		app.activate()

		let mainScreen = MainScreen()
		mainScreen.waitFor(app: app)
		mainScreen.newFolder(app: app, name: "UI Tests")
		mainScreen.newNote(app: app)

		// Should be able to fill the note body
		let markdownEditor = app.textViews["Markdown editor"].firstMatch
		// The editor is rendered in a WebView, which can take a while to load on CI
		markdownEditor.waitThenTap("the Markdown editor", timeout: 60.0)
		markdownEditor.typeText("Note body.")

		let stopEditing = app.buttons["Stop editing"].firstMatch
		stopEditing.waitThenTap("the \"stop editing\" button")
		
		// Should render
		let noteBodyText = app.staticTexts["Note body."]
		let rendered = noteBodyText.waitForExistence(timeout: 60.0)
		XCTAssertTrue(rendered)
	}
}

class MainScreen {
	private func sidebarToggle(_ app: XCUIApplication) -> XCUIElement {
		return app.buttons["Sidebar"]
	}

	func waitFor(app: XCUIApplication) {
		if !sidebarToggle(app).waitForExistence(timeout: 30.0) {
			assertionFailure("Failed to find the sidebar toggle")
		}
	}

	func openSidebar(app: XCUIApplication) -> SidebarScreen {
		sidebarToggle(app).firstMatch.waitThenTap("the sidebar toggle")
		return SidebarScreen()
	}
	
	func newFolder(app: XCUIApplication, name: String) {
		let sidebar = openSidebar(app: app)
		sidebar.newFolder(app: app, name: name)
	}
	
	func newNote(app: XCUIApplication) {
		app.buttons["Add new"].waitThenTap("the \"add new\" button")

		let newNoteButton = app.buttons
				.element(matching: NSPredicate(format: "label LIKE \"*New note\""))
		newNoteButton.firstMatch.waitThenTap("the \"new note\" button")
	}
}

class SidebarScreen {
	func newFolder(app: XCUIApplication, name: String) {
		let newFolderButton = app.buttons
				.element(matching: NSPredicate(format: "label LIKE \"*New Notebook\""))
		newFolderButton.firstMatch.waitThenTap("the \"new notebook\" button")

		let titleField = app.textFields["Enter notebook title"]
		titleField.firstMatch.waitThenTap("the notebook title field")
		titleField.firstMatch.typeText(name)
		
		let filledTitle = app.textFields[name]
		let found = filledTitle.waitForExistence(timeout: 10.0)
		if !found {
			// Currently, letters in rapidly typed text can be swapped (e.g. "Test" is input as "eTst").
			// This means that "found" can sometimes be false.
			// TODO: Fix this issue and fail if the typed title couldn't be found.
		}

		app.buttons["Save changes"].firstMatch.waitThenTap("the \"save changes\" button")
	}
}
