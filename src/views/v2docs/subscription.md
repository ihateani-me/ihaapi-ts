# GraphQL Subscription

Subscription is a GraphQL operation that use the WebSockets Protocol to send data over each other.<br>
Essentially giving live update of changes of the API.

?> Read more here: [GraphQL over WebSockets](https://the-guild.dev/blog/graphql-over-websockets)<br>
And here for more technical information: [GraphQL over WebSocket Protocol](https://github.com/apollographql/subscriptions-transport-ws/blob/master/PROTOCOL.md)

## Using Subscription

?> All connection must be made to `ws://api.ihateani.me/v2/graphql`

The first thing the user need to do is sent a Initial payload or `GQL_CONNECTION_INIT`<br>
The user need to sent `connection_init` type and `payload` object containing the connection options

<!-- tabs:start -->

#### ** Python **

Using [`websockets`](https://websockets.readthedocs.io/en/stable/intro.html) module

```py
import 
```

<!-- tabs:end -->