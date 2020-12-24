# Pagination

?> Currently, only [VTuber API](vtuberapi.md) that support pagination

Pagination is useful to quickly move between page and it save alot of resources between the user and server.

## Explanation
Whenever you requested to `vtuber` fields, there will be `pageInfo` fields that also could be requested in `live`, `upcoming`, `ended`, `videos`, and `channels` object.

```graphql
query {
    vtuber {
        live {
            items {
                id
            }
            pageInfo {
                nextCursor
                hasNextPage
            }
        }
    }
}
```

To request next page you need to change the query params with the `cursor` variables.

```graphql
query($cursor:String) {
    vtuber {
        live(cursor:$cursor) {
            items {
                id
            }
            pageInfo {
                nextCursor
                hasNextPage
            }
        }
    }
}
```

Then, in `variables` params, enter:
```json
{
    "cursor": "nextCursor"
}
```

Congrats you now successfully requested the next page.

`cursor` could also be empty, if it's empty it will return the first page.

## Example

This is an example to paginate through all page.

<!-- tabs:start -->

#### ** Query Variables **

We're using the `live` object as example

```graphql
query($cursor:String) {
    vtuber {
        live(cursor:$cursor) {
            items {
                id
                title
                channel_id
                group
                platform
            }
            pageInfo {
                nextCursor
                hasNextPage
            }
        }
    }
}
```

#### ** Python **

```py
import requests

sample = """query($cursor:String) {
    vtuber {
        live(cursor:$cursor) {
            items {
                id
                title
                channel_id
                group
                platform
            }
            pageInfo {
                nextCursor
                hasNextPage
            }
        }
    }
}
"""

all_items = []
session = requests.Session()
session.headers.update({
    "Content-Type": "application/json"
})
currentCur = ""
# Loop through until there's no next page anymore.
while True:
    variables = {"cursor": currentCur}
    print("Requesting on cursor:", currentCur)
    req = session.post("https://api.ihateani.me/v2/graphql", json={"query": sample, "variables": variables})
    results = req.json()["data"]["vtuber"]["live"]
    all_items.extend(results["items"])
    if not results["pageInfo"]["hasNextPage"]:
        break
    currentCur = results["pageInfo"]["nextCursor"]
    if currentCur is None:
        break
print(all_items)
```

<!-- tabs:end -->
