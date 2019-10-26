---
title: /contact
layout: page
permalink: /contact
---


<!-- 
<form>
  <input type="text" id="name" name="name" placeholder="name:" autocomplete="off">
  <input type="text" id="email" name="email" placeholder="email:" autocomplete="off">
  <textarea rows="5" id="message" name="message" placeholder="message:" autocomplete="off"></textarea>
  <input type="submit" value="[ submit ]">
</form>
-->

{% if site.linkedin_username %}
# Get in touch?
<a target="_blank" rel="noopener noreferrer"
href="https://www.linkedin.com/in/{{ site.linkedin_username }}"><img src="/assets/images/linkedin.png" style="width:20px; height:20px"></a>

{% endif %}
