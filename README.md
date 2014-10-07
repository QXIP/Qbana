# Qbana

Qbana is an indipendent Kibana 3 fork with several additional features and aggregations support,
intended as a possible alternative to Kibana 3-4 and for users willing to use < 1.4 ES "off-the-grid"

## Overview

Qbana is an open source (Apache Licensed), browser based analytics and search interface to Logstash
and other timestamped data sets stored in ElasticSearch. With those in place Qbana is a snap to
setup and start using (seriously). Qbana strives to be easy to get started with, while also being
flexible and powerful

### Requirements
* Elasticsearch 0.90.9 or above
* A modern web browser. The latest version of Chrome, Safari and Firefox have all been tested to
work. IE9 and greater should work. IE8 does not.
* A webserver. No extensions are required, as long as it can serve plain html it will work
* A browser reachable Elasticsearch server. Port 9200 must be open, or a proxy configured to allow
access to it.

### Docs

Documentation, panel options and tutorials can be found on the Wiki
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


__Q__: I'm running ES on a secured cluster with authentication. How do I configure this?  
__A__: Use in your config.js: elasticsearch: {server: "https://your.elasticsearch.server:80", withCredentials: true},



### Support & Contributing

If you have questions or comments, bugfixes or new feature that you would like to contribute, **please find or open an issue about it first.** 
