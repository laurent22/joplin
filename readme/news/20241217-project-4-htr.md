---
forum_url: https://discourse.joplinapp.org/t/42541
---

# Project 4: Handwritten Text Recognition (HTR) for Joplin

Joplin is partnering with a French government institution to bring you innovative new features! We will work on accessibility, voice typing, HTR and add Rocketbook integration. Today we'll present the planned HTR integration:

Currently, Joplin’s OCR (Optical Character Recognition) feature is designed to recognise printed text, which works great for scanning documents with standard fonts. However, we’re looking to expand this functionality to support handwritten text recognition (HTR), which would be beneficial to handle scanned, handwritten documents, as well as for the upcoming Rocketbook integration.

Handwritten text recognition is complex task, requiring significant processing power and large machine learning models. Because of this, we plan to implement HTR via a server, possibly integrated with Joplin Cloud or Joplin Server. The beauty of this approach is that handwritten text recognition is a rapidly evolving field, so we can continuously improve the server-side model. This means that every Joplin app can benefit from these updates without needing to redeploy or update the app itself.

For the Rocketbook integration, this integration will make a significant difference. Right now, your handwritten documents would be scanned as images, but with HTR, Joplin will be able to recognise the actual text you’ve written. Not only will your handwritten notes become searchable, but you’ll also be able to copy and paste the text into other documents.

![HTR illustration](https://raw.githubusercontent.com/laurent22/joplin/dev/Assets/WebsiteAssets/images/news/20241217-htr.jpg)