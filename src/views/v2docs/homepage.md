<h1 id="mulai-dari-sini" style="color:#c8c8c8;" align="center">
    ihaAPI v2 API
</h1>
<p align="center"><b>Version 2.5.1</b><br>A simple GraphQL endpoint for multiple utility</p>

# Introduction
Welcome to ihateani.me API v2, this API use GraphQL powered by Apollo GraphQL Server.

The API is a port of the old API from Python to Typescript then moved from normal REST API to GraphQL API to allow more flexible response

## VTuber API {docsify-ignore}
This is the main feature of the v2 API, this includes a live, upcoming, ended, channels, videos data.<br>
This API includes a lot of organization/groups and serve a data from YouTube, Twitch and Twitcasting.<br>
There is also Bilibili but their API are lately unstable so it's disabled until further notice.

**See: [VTuber API](vtuberapi.md)**

## Sauce API {docsify-ignore}
This API is a wrapper for SauceNAO, IQDB, and ASCII2D.<br>
This API can be used to source a image file

**See: [Sauce API](sauceapi.md)**

## nHentai API {docsify-ignore}
This is a wrapper for nHentai, this also includes a support of Image Proxy to bypass region blocking.<br>
The Image Proxy are located in the /v1/ endpoint

**See: [nHentai API](nhentaiapi.md)**

## ImageBooru API {docsify-ignore}
This is a wrapper of multiple Booru-like Image Board.

**See: [ImageBooru API](imagebooruapi.md)**