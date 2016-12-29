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

void WebApi::execRequest(QNetworkAccessManager::Operation method, const QString &path, const QUrlQuery &query, const QUrlQuery &data, const QString& tag) {
	QueuedRequest r;
	r.method = method;
	r.path = path;
	r.query = query;
	r.data = data;
	r.tag = tag;
	queuedRequests_ << r;

	processQueue();
}

void WebApi::post(const QString& path,const QUrlQuery& query, const QUrlQuery& data, const QString& tag) { execRequest(QNetworkAccessManager::PostOperation, path, query, data, tag); }
void WebApi::get(const QString& path,const QUrlQuery& query, const QUrlQuery& data, const QString& tag) { execRequest(QNetworkAccessManager::GetOperation, path, query, data, tag); }
void WebApi::put(const QString& path,const QUrlQuery& query, const QUrlQuery& data, const QString& tag) { execRequest(QNetworkAccessManager::PutOperation, path, query, data, tag); }
//void patch(const QString& path,const QUrlQuery& query = QUrlQuery(), const QUrlQuery& data = QUrlQuery(), const QString& tag = "") { execRequest(QNetworkAccessManager::PatchOperation, query, data, tag); }

void WebApi::setSessionId(const QString &v) {
	sessionId_ = v;
}

void WebApi::processQueue() {
	if (!queuedRequests_.size() || inProgressRequests_.size() >= 50) return;
	QueuedRequest& r = queuedRequests_.takeFirst();

	QString url = baseUrl_ + "/" + r.path;

	QNetworkRequest* request = new QNetworkRequest(url);
	request->setHeader(QNetworkRequest::ContentTypeHeader, "application/x-www-form-urlencoded");

	QNetworkReply* reply = NULL;

	if (r.method == QNetworkAccessManager::GetOperation) {
	   // TODO
	   //manager->get(QNetworkRequest(QUrl("http://qt-project.org")));
	}

	if (r.method == QNetworkAccessManager::PostOperation) {
		reply = manager_.post(*request, r.data.toString(QUrl::FullyEncoded).toUtf8());
	}

	if (r.method == QNetworkAccessManager::PutOperation) {
		reply = manager_.put(*request, r.data.toString(QUrl::FullyEncoded).toUtf8());
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
	if (r.method == QNetworkAccessManager::PutOperation) {
		cmd << "-X" << "PUT";
		cmd << "--data" << "'" + r.data.toString(QUrl::FullyEncoded) + "'";
		cmd << url;
	}

	//qDebug().noquote() << cmd.join(" ");

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
