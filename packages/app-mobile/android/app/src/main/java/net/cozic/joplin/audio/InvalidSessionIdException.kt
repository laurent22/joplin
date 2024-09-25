package net.cozic.joplin.audio


class InvalidSessionIdException(id: Int) : IllegalArgumentException("Invalid session ID $id") {
}