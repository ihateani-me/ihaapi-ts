# nHentai API

An API wrapper for nHentai.

This API wrap around the Search API, Info API, and Latest API.

**Search API** as expected, will search in nHentai, you could also use the special searching format a.k.a terms searching<br>
You can learn more here: [Terms Searching](https://nhentai.net/info/)

**Latest API** follow the same thing as Search API, but without any search params

**Info API** will fetch the information about a doujin ID.

**Table of Contents**:
- [Schemas](#schemas)
  - [nhInfoResult](#nhinforesult)
- [Variables](#variables)
- [Example](#example)

## Schemas

This is the GraphQL schemas that can be used to request to the nHentai API.

You can see it more in detail in the [API References](https://api.ihateani.me/v2/gql-docs/api-references)

```graphql
nhentai {
    "Doujin information"
    info {

    }
    "Search doujin"
    search {
        "The query used"
        query
        "Page information"
        pageInfo {
            "Current page"
            current
            "total page"
            total
        }
        results {

        }
    }
    "Get latest doujin"
    latest {
        "Page information"
        pageInfo {
            "Current page"
            current
            "total page"
            total
        }
        results {

        }
    }
}
```

The `info` and `results` files in `search` and `latest` are using something called `nhInfoResult` Object.

### nhInfoResult

```graphql
{
    "The doujin ID"
    id
    "The doujin media ID"
    media_id
    "The doujin title data"
    title {
        "Truncated title"
        simple
        "English title, if exists"
        english
        "Japanese title, if exists"
        japanese
    }
    "Cover art data"
    cover_art {
        "Type, this should be `thumbnail`"
        type
        "The proxied URL"
        url
        "The original URL"
        original_url
        "The sizes mapping, a list of width and height"
        sizes
    }
    "The tags data, self explanatory, all of them are a list."
    tags {
        artists {
            name
            amount
        }
        categories {
            name
            amount
        }
        languages {
            name
            amount
        }
        groups {
            name
            amount
        }
        tags {
            amount
            name
        }
        parodies {
            name
            amount
        }
        characters {
            name
            amount
        }
    }
    "The images list, same as cover_art data type"
    images {
        sizes
        original_url
        url
        "Should be `image"
        type
    }
    "The url to nhentai"
    url
    "Time published, formatted in ISO8601 format."
    publishedAt
    "Total favorites"
    favorites
    "Total pages"
    total_pages
}
```

`tags` fields data like `artists` etc are a list.

`images` are a list

`tags` data include a `name` field that contains the tag name, and `amount` is the total doujin in that tag.

## Variables

The variables that could be sent to the API

<!-- tabs:start -->

#### ** info **
* **doujin_id**: This is required, it's a string of the doujin ID like `177013`

#### ** search **
* **query**: This is required, something to search on nHentai
* **page**: Page to fetch, you can check with the `pageInfo` fields for total page and current page for paginating

#### ** latest **
* **page**: Page to fetch, you can check with the `pageInfo` fields for total page and current page for paginating
  
<!-- tabs:end -->

## Example

<!-- tabs:start -->

#### ** Query Variables **

In this example, we will be using the info API only

```graphql
query($doujin:ID!) {
    nhentai {
        info(doujin_id:$doujin) {
            id
            media_id
            title {
                simple
                japanese
            }
            cover_art {
                url
            }
            url
            publishedAt
            favorites
            total_pages
        }
    }
}
```

We will also send this variables

```json
{
    "doujin": "177013"
}
```

#### ** Python **

```py
import requests

sample = """query($doujin:ID!) {
    nhentai {
        info(doujin_id:$doujin) {
            id
            media_id
            title {
                simple
                japanese
            }
            cover_art {
                url
            }
            url
            publishedAt
            favorites
            total_pages
        }
    }
}
"""

data = {
    "query": sample,
    "variables": {
        "doujin": "177013"
    }
}
req = requests.post("https://api.ihateani.me/v2/graphql", json=data)
print(req.json())
```

#### ** JavaScript **

```js
let sample = `query($doujin:ID!) {
    nhentai {
        info(doujin_id:$doujin) {
            id
            media_id
            title {
                simple
                japanese
            }
            cover_art {
                url
                original_url
            }
            url
            publishedAt
            favorites
            total_pages
        }
    }
}`

let variables = {
    "doujin": "177013"
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
        "nhentai": {
            "info": {
                "id": "177013",
                "media_id": "987560",
                "title": {
                    "simple": "METAMORPHOSIS",
                    "japanese": null
                },
                "cover_art": {
                    "url": "https://api.ihateani.me/v1/nh/t/987560/cover.jpg",
                    "original_url": "https://t.nhentai.net/galleries/987560/cover.jpg"
                },
                "url": "https://nhentai.net/g/177013",
                "publishedAt": "2016-10-18T12:28:49Z",
                "favorites": 44548,
                "total_pages": 225
            }
        }
    }
}
```

<!-- tabs:end -->