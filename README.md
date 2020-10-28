# ihaapi-ts
api.ihateani.me but written in TypeScript

The website are originally written in Python with Sanic as it's backend.<br>
I'm creating this to actually try javascript and typescript.

Currently not deployed publicly.

Running the server: `npm run start`

## Running it yourself
Don't.

I made it for myself so you need to change some files, especially `dbconn/index.ts`<br>
Where I put 2 const because my brain decided to use 2 different DB and not one single db.

The database can be hosted anywhere, the backend part could be found here: [noaione/vtb-schedule/server](https://github.com/noaione/vtb-schedule/tree/master/server)

`routes/museid.ts` could be deleted since it was specifically made for ONE discord server.

**Version 0.9.4 Update**:<br>
Running it yourself, you need to have 3-4 different database named:<br>
- vtbili
- vtniji [optional, can be merged with `vtbili`]
- museid [optional]
- u2db [optional, for U2 check data (can be ignored if you want.)]

You also need, to create the following collection with document:<br>
- vtbili
    - hololive_data
        - live: array
        - upcoming: array
        - channels: array
    - nijisanji_data
        - live: array
        - upcoming: array
        - channels: array
    - otherbili_data
        - upcoming: array
        - channels: array
    - hololive_ignored
        - data: array
    - nijisanji_ignored
        - data: array
    - twitcasting_data
        - live: array
    - twitch_data
        - live: array
    - twitch_channels<br>
        Empty data, only add `_id`
    - twitcasting_channels<br>
        Empty data, only add `_id`
    - yt_other_livedata<br>
        Empty data, only add `_id`
    - yt_other_ended_ids<br>
        Empty data, only add `_id`
    - yt_other_channels<br>
        Empty data, only add `_id`
- vtniji
    - nijitube_live<br>
        Empty data, only add `_id`
    - nijitube_ended_ids<br>
        Empty data, only add `_id`
    - nijitube_channels<br>
        Empty data, only add `_id`
- museid
    - live_data<br>
        Empty data, only add `_id`
    - video_ids<br>
        Empty data, only add `_id`
- u2db
    - u2data
        - data: array
    - offersdata
        - data: array

This assume you use MongoDB Atlas.

## License
MIT License, refer more to the [LICENSE](https://github.com/noaione/ihaapi-ts/blob/master/LICENSE) file.
