# Joplin Server Business

<div style="overflow: auto;">

<img src="https://raw.githubusercontent.com/laurent22/joplin/dev/Assets/WebsiteAssets/images/joplin_server_business/main.png" width="200px" style="float: left; margin-right: 16px; margin-bottom: 16px;"/>

Joplin Server Business is a synchronisation server that you can install on your own infrastructure, so that your data remains private and secure within your business.

Your teams can collaborate on notebooks and share information. They can also publish notes to the internet or within your own intranet. All that secured by Joplin end-to-end encryption.

Interested? [Contact us for a quote](https://tally.so/r/D4BlOE)

</div>

## Smart teamwork with Joplin Server

### Self-host to keep your data within your organisation

<div style="overflow: auto;">

<img src="https://raw.githubusercontent.com/laurent22/joplin/dev/Assets/WebsiteAssets/images/joplin_server_business/self_host.jpg" width="200px" style="float: left; margin-right: 16px; margin-bottom: 16px;"/>

The data is hosted on your own server, giving you full control over it and ensuring it stays within your organisation.

</div>

### Share and collaborate on a notebook

<div style="overflow: auto;">

<img src="https://raw.githubusercontent.com/laurent22/joplin/dev/Assets/WebsiteAssets/images/joplin_server_business/share.jpg" width="200px" style="float: left; margin-right: 16px; margin-bottom: 16px;"/>

Our service allows you to share notes and documents across unlimited devices. Create and modify teams to manage projects and planning.

</div>

### Publish notes to the internet

<div style="overflow: auto;">

<img src="https://raw.githubusercontent.com/laurent22/joplin/dev/Assets/WebsiteAssets/images/joplin_server_business/publish.jpg" width="200px" style="float: left; margin-right: 16px; margin-bottom: 16px;"/>

You can publish a note so that it can be viewed in a browser by your colleagues and customers. The note can be available publicly on the internet or remain within your intranet.

</div>

### Manage multiples users and teams

<div style="overflow: auto;">

<img src="https://raw.githubusercontent.com/laurent22/joplin/dev/Assets/WebsiteAssets/images/joplin_server_business/teams.jpg" width="200px" style="float: left; margin-right: 16px; margin-bottom: 16px;"/>

Using Joplin Server Business you can create and manage teams of users. Each team can collaborate on notebooks and notes and share information.

</div>

## By choosing Joplin Server Business your organisation benefits also from other features including:

### End-to-end encryption

Activate encryption to protect your data and secure communications across teams.

### Web clipper

Capture web pages and screenshots and save them as notes in Joplin.

### Open source code

Our desktop and mobile applications, as well as the end-to-end technology, are fully open source, ensuring transparency and increased security.

### Synchronization across devices

Securely synchronise your data across multiple devices - including iOS, Android, Windows, macOS and Linux.

### Customise it

Customise the app with plugins, custom themes and multiple text editors (Rich Text or Markdown). Or create your own company-specific workflow by developing scripts and plugins using the Extension API.

### Multimedia notes (PDF, images, etc.)

Keep all your resources in one place. Save and share images, PDFs, videos, audio files and math expressions.

## Did you know that there are over 150 plugins available for Joplin products ?

[Go to the plugin website](https://joplinapp.org/plugins/)

## Ready to give it a try ?

To find out more about Joplin Server Business and how it can be integrated to your organisation, feel free to contact us. Our experts can prepare a demo for you. We can provide a quote to accommodate your company’s needs.

[Contact us for a quote!](https://tally.so/r/D4BlOE)

## Difference with Joplin Server

Alongside the standard Joplin Server capabilities, JSB offers several additional features:

* **Team support** – streamlines the management of multiple users. It provides a central dashboard showing all members in your organisation, making it simple to add or remove users and handle centralised billing.
* **Share permissions** – lets you specify whether a shared notebook can be edited or viewed only. This is useful, for instance, when sharing documentation that should remain unchanged.
* **Customisable publishing banner** – allows you to add a logo, adjust the text, and alter the banner’s colour to suit your branding.
* **Email to Note** – enables you to save emails directly to JSB by forwarding them to a dedicated address. This requires a functioning mail infrastructure.

## Technical specifications

### Software requirements

* **Operating System:** Linux (Ubuntu 20.04 LTS recommended) or any OS supporting Docker
* **Docker Engine:** Version 20.10 or later
* **Docker Compose:** Version 1.29 or later (required if using PostgreSQL or multi-container setup)
* **Database:**
  * SQLite (for testing/dev only)
  * PostgreSQL 16.8+ (recommended for production)
* **Reverse Proxy (optional):** Apache 2.4+ or Nginx 1.18+ (for public HTTPS access)

### Hardware requirements

* **CPU:** 2 cores, 4 threads (Intel Xeon Platinum 8259CL @ 2.50 GHz)
* **RAM:** Minimum 4 GB, recommended 8 GB
* **Storage:**
  * Minimum 50 GB SSD (faster storage preferred for database and content)
  * Additional storage if using filesystem or S3 for note content
* **Network:** Reliable 1 Gbps Ethernet connection for syncing clients

These specs ensure stable operation of Joplin Server under moderate load with multiple concurrent users. Higher specs may be required for large-scale deployments.

For a detailed technical documentation, please [see the setup instructions](https://github.com/laurent22/joplin/tree/dev/packages/server).