# Sauce API
An API wrapper for SauceNAO, IQDB, and ASCII2D.

**Table of Contents**:
- [Schemas](#schemas)
  - [SauceObject](#sauceobject)
- [Variables](#variables)
- [Example](#example)

## Schemas

This is the GraphQL schemas that can be used to request to the Sauce API.

You can see it more in detail in the [API References](https://api.ihateani.me/v2/gql-docs/api-references)

```graphql
sauce {
    "Search sauce using SauceNAO"
    saucenao {
        _total
        items {}
    }
    "Search sauce using IQDB"
    iqdb {
        _total
        items {}
    }
    "Search sauce using ASCII2D"
    ascii2d {
        _total
        items {}
    }
}
```

All of them use something called `SauceObject` in the `items` fields.

`_total` is the total returned data.

### SauceObject

```graphql
{
    "The image name, this depends on the sources"
    title
    "The image source URL"
    source
    "The confidence, if it's ASCII2D its just Index number"
    confidence
    "The thumbnail of the sauce image"
    thumbnail
    "Extra info, this depends on the sources, will be in JSON or Object"
    extra_info
    "Indexer used for this image"
    indexer
}
```

## Variables

The Sauce API accept this following required variables:
* **url**: a image URL as string, this is required

SauceNAO and IQDB object have this optional variables:
* **minsim**: a floating number, minimum similarity needed
* **limit**: limit the total results

ASCII2D accept `limit` as extra optional variable.

## Example

<!-- tabs:start -->

#### ** Query Variables **

In this example, we will use SauceNAO and IQDB for fetching an Image.

```graphql
query($url:String!) {
    sauce {
        saucenao(url:$url) {
            items {
                title
                source
                confidence
                thumbnail
                indexer
                extra_info
            }
        }
        iqdb(url:$url) {
            items {
                title
                source
                confidence
                thumbnail
                indexer
                extra_info
            }
        }
    }
}
```

We will also send this variables

```json
{
    "url": "https://media.discordapp.net/attachments/788266730911825930/791692664482955264/EpjcR7mVQAAvdTM.jpg"
}
```

#### ** Python **

```py
import requests

sample = """query($url:String!) {
    sauce {
        saucenao(url:$url) {
            items {
                title
                source
                confidence
                thumbnail
                indexer
                extra_info
            }
        }
        iqdb(url:$url) {
            items {
                title
                source
                confidence
                thumbnail
                indexer
                extra_info
            }
        }
    }
}
"""

data = {
    "query": sample,
    "variables": {
        "url": "https://media.discordapp.net/attachments/788266730911825930/791692664482955264/EpjcR7mVQAAvdTM.jpg"
    }
}
req = requests.post("https://api.ihateani.me/v2/graphql", json=data)
print(req.json())
```

#### ** JavaScript **

```js
let sample = `query($url:String!) {
    sauce {
        saucenao(url:$url) {
            items {
                title
                source
                confidence
                thumbnail
                indexer
                extra_info
            }
        }
        iqdb(url:$url) {
            items {
                title
                source
                confidence
                thumbnail
                indexer
                extra_info
            }
        }
    }
}`

let variables = {
    "url": "https://media.discordapp.net/attachments/788266730911825930/791692664482955264/EpjcR7mVQAAvdTM.jpg"
}

let url = 'https://api.ihateani.me/v2/graphql',
    options = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        },
        body: JSON.stringify({
            query: sample,
            variables: variables
        })
    };

fetch(url, options).then(handleResponse)
                    .then(handleData)
                    .catch(handleError);

function handleResponse(resp) {
    return resp.json().then((json) => {
        return resp.ok ? json : Promise.reject(json);
    });
}

function handleData(data) {
    console.log(data);
}

function handleError(err) {
    alert("Error occured, please check dev console");
    console.error(error);
}
```

#### ** Response **

The query request should return the following JSON response (or close to):

```json
{
  "data": {
    "sauce": {
      "saucenao": {
        "items": [
          {
            "title": "[namaonpa] namaonpa, nakiri ayame (4257359)",
            "source": "https://danbooru.donmai.us/post/show/4257359",
            "confidence": 95.09,
            "thumbnail": "https://img3.saucenao.com/booru/1/5/1510f302615f6b34655695a3ff6b2d1a_2.jpg?auth=Lplj6GT1kf9NWHJYHUDUBw&exp=1609272000",
            "indexer": "danbooru",
            "extra_info": {}
          }
        ]
      },
      "iqdb": {
        "items": [
          {
            "title": "1girl :3 animal_ears blurry blurry_background blush cat_ears colored_tips earrings floral_print food hair_ornament highres hololive horns ice_cream ice_cream_float indoors jewelry long_hair long_sleeves looking_at_viewer maid_headdress nakiri_ayame namaonpa pointy_ears red_eyes red_hair silver_hair solo tray virtual_youtuber wa_maid wide_sleeves (4257359)",
            "source": "https://danbooru.donmai.us/posts/4257359",
            "confidence": 96.984257,
            "thumbnail": "https://iqdb.org/danbooru/1/5/1/1510f302615f6b34655695a3ff6b2d1a.jpg",
            "indexer": "danbooru",
            "extra_info": {}
          }
        ]
      }
    }
  }
}
```

<!-- tabs:end -->