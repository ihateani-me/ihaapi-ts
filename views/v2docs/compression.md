# Compression
The whole website is covered with Compression provided by ExpressJS [compression](https://github.com/expressjs/compression) middleware.

To compress the result you just need to provide a proper `Accept-Encoding` header to the request.<br>
For example for `gzip` compression you could add `Accept-Encoding: gzip` to the header.

Make sure your module/browser could decompress the Encoding properly so it's not broken.

## Example

This is code example for using compression

<!-- tabs:start -->

#### ** Python **
```py
import requests

sample = """query {
    vtuber {
        channels {
            id
            name
            platform
            group
            description
        }
    }
}
"""

headers = {"Accept-Encoding": "gzip", "Content-Type": "application/json"}
data = {"query": sample}
req = requests.get("https://api.ihateani.me/v2/graphql", headers=headers, json=data)
print(req.json())
```

#### ** JavaScript **

```js
let sample = `query {
    vtuber {
        channels {
            id
            name
            platform
            group
            description
        }
    }
}`

let url = "https://api.ihateani.me/v2/graphql",
    options = {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "Accept-Encoding": "gzip"
        },
        body: JSON.stringify({
            query: sample,
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

<!-- tabs:end -->