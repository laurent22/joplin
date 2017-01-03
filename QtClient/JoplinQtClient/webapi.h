#ifndef WEBAPI_H
#define WEBAPI_H

#include <stable.h>
#include "enum.h"

namespace jop {

class WebApi : public QObject {

	Q_OBJECT

public:

	struct QueuedRequest {
		HttpMethod method;
		QString path;
		QUrlQuery query;
		QUrlQuery data;
		QNetworkReply* reply;
		QNetworkRequest* request;
		QString tag;
		QBuffer* buffer;
	};

	WebApi(const QString& baseUrl);
	QString baseUrl() const;
	void execRequest(HttpMethod method, const QString& path,const QUrlQuery& query = QUrlQuery(), const QUrlQuery& data = QUrlQuery(), const QString& tag = "");
	void post(const QString& path,const QUrlQuery& query = QUrlQuery(), const QUrlQuery& data = QUrlQuery(), const QString& tag = "");
	void get(const QString& path,const QUrlQuery& query = QUrlQuery(), const QUrlQuery& data = QUrlQuery(), const QString& tag = "");
	void put(const QString& path,const QUrlQuery& query = QUrlQuery(), const QUrlQuery& data = QUrlQuery(), const QString& tag = "");
	void del(const QString& path,const QUrlQuery& query = QUrlQuery(), const QUrlQuery& data = QUrlQuery(), const QString& tag = "");
	void patch(const QString& path,const QUrlQuery& query = QUrlQuery(), const QUrlQuery& data = QUrlQuery(), const QString& tag = "");
	void setSessionId(const QString& v);

private:

	QString baseUrl_;
	QList<QueuedRequest> queuedRequests_;
	QList<QueuedRequest> inProgressRequests_;
	void processQueue();
	QString sessionId_;
	QNetworkAccessManager manager_;

public slots:

	void request_finished(QNetworkReply* reply);
	void request_error(QNetworkReply::NetworkError e);

signals:

	void requestDone(const QJsonObject& response, const QString& tag);

};

}

#endif // WEBAPI_H
