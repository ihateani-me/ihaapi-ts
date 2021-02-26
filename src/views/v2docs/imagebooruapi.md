# ImageBooru API

An API wrapper for Booru-like Image Board (Danbooru, Gelbooru, etc.)

**Supported Image Board**:
- [Danbooru](https://danbooru.donmai.us/)
- [Safebooru](https://danbooru.donmai.us/posts?tags=rating%3As) (Danbooru)
- [Konachan](https://konachan.net/post)
- [Gelbooru](https://gelbooru.com/index.php?page=post&s=list&tags=all)

**Table of Contents**:
- [Schemas](#schemas)
  - [ImageBoardResult](#imageboardresult)
- [Variables](#variables)
- [Example](#example)

## Schemas

This is the GraphQL schemas that can be used to request to the Sauce API.

You can see it more in detail in the [API References](https://api.ihateani.me/v2/gql-docs/api-references)

```graphql
imagebooru {
    "Search the image board"
    search {
        total
        results {}
    }
    "Search the image board, this will be randomized"
    random {
        total
        results {}
    }
}
```

All of them use something called `ImageBoardResult` in the `results` fields.

`total` is the total returned data.

### ImageBoardResult

```graphql
"""
The result of the search params on the selected Image board.
"""
{
    "The image ID"
    id: ID!
    "The image title"
    title: String!
    "The image tags"
    tags: [String]
    "The image meta tags (If available)"
    meta: [String]
    "The image artist tags (If available)"
    artist: [String]
    "The image source (If available)"
    source: String
    "The image thumbnail"
    thumbnail: String!
    "The image URL"
    image_url: String!
    "Image metadata information"
    image_info: ImageInfo
    "Extras data that might be omitted by the selected engine"
    extras: JSON
    "The board engine or type used for the image"
    engine: BoardEngine!
}
```

`ImageInfo` contains the image `w` (width), `h` (height)<br>
With additional `e` (extension) and `s` (size) sometimes

`BoardEngine` is ENUM of the supported Image Board

## Variables

The Image Booru API accepts 3 variables:
- **tags**: this will be your tags params in list (maximum of 2, excluding meta tags)
- **page**: the page that will be returned
- **engine**: The engiine that will be used, must be a list.

**tags** can be empty

## Example

<!-- tabs:start -->

#### ** Query Variables **

In this example, we will use the Search method.

```graphql
query BooruSearch($tags:[String],$page:Int! = 1) {
    imagebooru {
        search(tags:$tags,engine:[danbooru,konachan,gelbooru],page:$page) {
            results {
                id
                title
                tags
                thumbnail
                image_url
                source
                engine
            }
            total
        }
    }
}
```

We will also send this variables

```json
{
    "tags": ["hololive"]
}
```

#### ** Python **


```py
import requests

sample = """query BooruSearch($tags:[String],$page:Int! = 1) {
    imagebooru {
        search(tags:$tags,engine:[danbooru,konachan,gelbooru],page:$page) {
            results {
                id
                title
                tags
                thumbnail
                image_url
                source
                engine
            }
            total
        }
    }
} }
}
"""

data = {
    "query": sample,
    "variables": {
        "tags": ["hololive"]
    }
}
req = requests.post("https://api.ihateani.me/v2/graphql", json=data)
print(req.json())
```

#### ** JavaScript **

```js
let sample = `query BooruSearch($tags:[String],$page:Int! = 1) {
    imagebooru {
        search(tags:$tags,engine:[danbooru,konachan,gelbooru],page:$page) {
            results {
                id
                title
                tags
                thumbnail
                image_url
                source
                engine
            }
            total
        }
    }
}`

let variables = {
    "tags": ["hololive"]
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
        "imagebooru": {
            "search": {
                "total": 45,
                "results": [
                    {
                        "id": "4381346",
                        "title": "original",
                        "tags": [
                            "1girl",
                            "black_hair",
                            "black_legwear",
                            "breasts",
                            "brown_eyes",
                            "cityscape",
                            "cowboy_shot",
                            "desk",
                            "id_card",
                            "indoors",
                            "lanyard",
                            "large_breasts",
                            "long_hair",
                            "long_sleeves",
                            "monitor",
                            "mouth_hold",
                            "night",
                            "office_lady",
                            "pantyhose",
                            "pencil_skirt",
                            "purple_shirt",
                            "shirt",
                            "skirt",
                            "solo",
                            "torn_clothes",
                            "torn_legwear"
                        ],
                        "thumbnail": "https://cdn.donmai.us/preview/3b/c3/3bc3e2a3b64b4d728925b1c43a6ab25b.jpg",
                        "image_url": "https://danbooru.donmai.us/data/3bc3e2a3b64b4d728925b1c43a6ab25b.jpg",
                        "source": "https://i.pximg.net/img-original/img/2021/02/26/14/20/34/88058842_p0.jpg",
                        "engine": "danbooru"
                    },
                    {
                        "id": "4381345",
                        "title": "junko_(touhou)",
                        "tags": [
                            "1girl",
                            "bangs",
                            "black_dress",
                            "black_headwear",
                            "chinese_clothes",
                            "closed_mouth",
                            "crescent_moon",
                            "dress",
                            "eyebrows_behind_hair",
                            "from_side",
                            "headdress",
                            "long_hair",
                            "long_sleeves",
                            "looking_at_viewer",
                            "moon",
                            "orange_hair",
                            "red_eyes",
                            "simple_background",
                            "smile",
                            "solo",
                            "standing",
                            "tabard",
                            "upper_body",
                            "white_background",
                            "wide_sleeves"
                        ],
                        "thumbnail": "https://cdn.donmai.us/preview/87/70/8770b064c810d4978be27f558cd5f5a8.jpg",
                        "image_url": "https://danbooru.donmai.us/data/8770b064c810d4978be27f558cd5f5a8.jpg",
                        "source": "https://twitter.com/kamepan44231/status/1362787990196473857",
                        "engine": "danbooru"
                    },
                    ...
                ]
            }
        }
    }
}s
```

This results is truncated!

<!-- tabs:end -->