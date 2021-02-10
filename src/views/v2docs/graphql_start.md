# Getting Started
<hr>

## What is GraphQL? {docsify-ignore}

GraphQL is a strongly typed API query language that provides an alternative to REST API. It allows the client to define the structure of the data required, and exactly the same data is returned by the server. This make GraphQL a really flexible and powerful API.

?> It's recommended to check the official GraphQL documentation for Querying here: [GraphQL Queries](http://graphql.org/learn/queries/)

## Making Request {docsify-ignore}

?> **All requests must be made as POST request to** '[https://api.ihateani.me/v2/graphql](https://api.ihateani.me/v2/graphql)'

When you make a request to the API, you'll need to provide a required `query` and optional `variables` data.

* query: contains your query string
* variables: contains any variables to be used in the query.

`variables` is pretty much optional since you could hard-code it into code, if you want to use pagination it's recommended to use this.

You could also play around in the provided **GraphQL Playground** here: [GraphQL Playground](https://api.ihateani.me/v2/graphql)

## Example Request {docsify-ignore}

This is a sample to get live data of Youtuebe streams from VTuber API.

<!-- tabs:start -->

#### ** Query Variables **

This will request to the API to get Youtube Live Streams with hard limit data returned are 5.

This will also return only return a stream from Hololive only

```graphql
query($group:[String]) {
    vtuber {
        live(platforms:[youtube],limit:5,groups:$group) {
            _total
            items {
                id
                title
                timeData {
                    startTime
                    scheduledStartTime
                    lateBy
                }
                thumbnail
                group
                channel {
                    id
                    name
                    image
                }
            }
        }
    }
}
```

#### ** Python **

```py
import requests

sample = """query($group:[String]) {
    vtuber {
        live(platforms:[youtube],limit:5,groups:$group) {
            _total
            items {
                id
                title
                timeData {
                    startTime
                    scheduledStartTime
                    lateBy
                }
                thumbnail
                group
                channel {
                    id
                    name
                    image
                }
            }
        }
    }
}
"""

data = {
    "query": sample,
    "variables": {
        "group": ["hololive"]
    }
}
req = requests.post("https://api.ihateani.me/v2/graphql", json=data)
print(req.json())
```

#### ** JavaScript **

```js
let sample = `query($group:[String]) {
    vtuber {
        live(platforms:[youtube],limit:5,groups:$group) {
            _total
            items {
                id
                title
                timeData {
                    startTime
                    scheduledStartTime
                    lateBy
                }
                thumbnail
                group
                channel {
                    id
                    name
                    image
                }
            }
        }
    }
}`

let variables = {
    "group": ["hololive"]
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
    "vtuber": {
      "live": {
        "_total": 10,
        "items": [
          {
            "id": "_xrd6J677Yc",
            "title": "【GTAV】なぁにがクリスマスじゃ！！轢き〇すぞ！🎄Today is a wonderful Christmas!【ホロライブ/不知火フレア】",
            "timeData": {
              "startTime": 1608818489,
              "scheduledStartTime": 1608818400,
              "lateBy": 89
            },
            "thumbnail": "https://i.ytimg.com/vi/_xrd6J677Yc/maxresdefault_live.jpg",
            "group": "hololive",
            "channel": {
              "id": "UCvInZx9h3jC2JzsIzoOebWg",
              "name": "Flare Ch. 不知火フレア",
              "image": "https://yt3.ggpht.com/ytc/AAUvwngtkUgGkgWTz57Er3GSzuMUR07HISM_yDhKQFnR_A=s800-c-k-c0x00ffffff-no-rj"
            }
          },
          {
            "id": "S5V8z-785M4",
            "title": "【Minecraft】ついに本番！聖夜のエンダードラゴンRTA！【湊あくあ/ホロライブ】",
            "timeData": {
              "startTime": 1608807761,
              "scheduledStartTime": 1608807600,
              "lateBy": 161
            },
            "thumbnail": "https://i.ytimg.com/vi/S5V8z-785M4/maxresdefault_live.jpg",
            "group": "hololive",
            "channel": {
              "id": "UC1opHUrw8rvnsadT-iGp7Cg",
              "name": "Aqua Ch. 湊あくあ",
              "image": "https://yt3.ggpht.com/ytc/AAUvwngM9Jmc29dvbOY43w7RWFbOZLU4tGtOkEwtt-g7PA=s800-c-k-c0x00ffffff-no-rj"
            }
          },
          {
            "id": "pnGTk-gbqF4",
            "title": "All Night Polka Party【尾丸ポルカ/ホロライブ】",
            "timeData": {
              "startTime": 1608818614,
              "scheduledStartTime": 1608818400,
              "lateBy": 214
            },
            "thumbnail": "https://i.ytimg.com/vi/pnGTk-gbqF4/maxresdefault_live.jpg",
            "group": "hololive",
            "channel": {
              "id": "UCK9V2B22uJYu3N7eR_BT9QA",
              "name": "Polka Ch. 尾丸ポルカ",
              "image": "https://yt3.ggpht.com/ytc/AAUvwni13e9pDow2afsp2f5CBPehEvYhFApFZoHaJWLu=s800-c-k-c0x00ffffff-no-rj"
            }
          },
          {
            "id": "W_D-TVQZ5cQ",
            "title": "【オフコラボ】🎄🌟クリスマス会🌟🎄【ホロライブ/はあるしかなココ】",
            "timeData": {
              "startTime": 1608819217,
              "scheduledStartTime": 1608818400,
              "lateBy": 817
            },
            "thumbnail": "https://i.ytimg.com/vi/W_D-TVQZ5cQ/maxresdefault_live.jpg",
            "group": "hololive",
            "channel": {
              "id": "UCZlDXzGoo7d44bwdNObFacg",
              "name": "Kanata Ch. 天音かなた",
              "image": "https://yt3.ggpht.com/ytc/AAUvwniXUgLD1FepLsMoqO7HnhlgwbxGmPeqKWGv1JsO=s800-c-k-c0x00ffffff-no-rj"
            }
          },
          {
            "id": "KePoUIpZtGI",
            "title": "【歌枠耐久!?】クリスマススペシャル！🎄24時までに65万人突破できるか！？【ホロライブ / 星街すいせい】",
            "timeData": {
              "startTime": 1608807748,
              "scheduledStartTime": 1608807600,
              "lateBy": 148
            },
            "thumbnail": "https://i.ytimg.com/vi/KePoUIpZtGI/maxresdefault_live.jpg",
            "group": "hololive",
            "channel": {
              "id": "UC5CwaMl1eIgY8h02uZw7u8A",
              "name": "Suisei Channel",
              "image": "https://yt3.ggpht.com/ytc/AAUvwnjdAl5rn3IjWzl55_0-skvKced7znPZRuPC5xLB=s800-c-k-c0x00ffffff-no-rj"
            }
          }
        ]
      }
    }
  }
}
```

<!-- tabs:end -->