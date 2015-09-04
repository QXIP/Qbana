# ![qb](https://raw.githubusercontent.com/QXIP/Qbana/master/src/img/qb.png) 
Qbana (Ω) is an independent Kibana 3 fork with several additional features, new Panels, integrated Sense and client/server aggregations support, intended as dedicated tool for nProbe users as well as a possible alternative to Kibana for ElasticSearch users and abusers willing to live *"off-the-grid"*

Qbana ships loaded with: 
* Dashboards for [nProbe v7](http://www.ntop.org/products/nprobe/) and its many plugins *(HTTP, DNS, SIP, RTP, PROCESSES, etc)*
* Features for server/client-side aggregations, multi-value term_stats and stats, additional datatypes and more
* Additional Panels and D3 Visualizers *(Force, Flows, Flow Histograms, Bullet Stats, MuchBetterMaps, etc)*
* Developer console *(Sense)* linked to Inspect which allows you to easily issue calls to Elasticsearch’s REST API
* Flexibility to add/extend/change whatever you want without having to deal with anyone's business-plan

######<i>"Join the Ω"</i></font>

## Overview

Qbana is an open source (Apache Licensed), browser based analytics and search interface to nProbe,
Logstash and other timestamped data sets stored in ElasticSearch. 

### Requirements
* Elasticsearch 0.90.9 or above
* A modern web browser. The latest version of Chrome, Safari and Firefox have all been tested to
work. IE9 and greater should work. IE8 does not.
* A webserver. No extensions are required, as long as it can serve plain html it will work
* A browser reachable Elasticsearch server. Port 9200 must be open, or a proxy configured to allow
access to it.

### Suggested
* A reverse proxy to take care of security or a [hosted solution](http://facetflow.com) which does it for you

### Mugshot
![Screenshot](http://i.imgur.com/9gXTKCd.png)

### Docs

Documentation, panel options and tutorials can be found on the [WiKi](https://github.com/QXIP/Qbana/wiki)
### Installation

1. Download and extract a snapshot or clone this repository to your webserver.
2. Edit config.js in your deployed directory to point to your elasticsearch server. This should __not be
http://localhost:9200__, but rather the fully qualified domain name of your elasticsearch server.
The url entered here _must be reachable_ by your browser.
3. Point your browser at your installation. If you're using Logstash with the default indexing
configuration the included Kibana logstash interface should work nicely.



### FAQ
__Q__: Why doesnt it work? I have http://localhost:9200 in my config.js, my webserver and elasticsearch
server are on the same machine  
__A__: Qbana does not work like Kibana 2 or 4. To ease deployment, the server side
component has been eliminated. Thus __the browser connects directly to Elasticsearch__. The default
config.js setup works for the webserver+Elasticsearch on the same machine scenario. Do not set it
to http://localhost:9200 unless your browser and elasticsearch are on the same machine

__Q__: How do I secure this? I don't want to leave 9200 open.  
__A__: A simple nginx virtual host and proxy configuration can be found in the sample/nginx.conf


__Q__: I'm running ES on a secured cluster with authentication. How do I configure Qbana?  
__A__: Use in your config.js: **elasticsearch: {server: "https://your.elasticsearch.server:80", withCredentials: true},**

__Q__: I'm running ES on a secured cluster with authentication. How do I configure Sense?  
__A__: Open Sense (/sense) and perform an initial query/configuration using **https://user:pass@server:port**



### Support & Contributing

If you have questions or comments, bugfixes or new feature that you would like to contribute, **please find or open an issue about it first.** 




---

This project sponsored by: 
<br>
<a href="http://qxip.net" target="_blank"><img src="http://www.sipcapture.org/data/images/qxip.png"></a> <a href="http://ntop.org" target="_blank"><img src="http://www.ntop.org/wp-content/uploads/2011/08/logo_new_m.png"></a> <a href="http://facetflow.com" target="_blank"><img src="http://i.imgur.com/cIvYisr.png"></a>
