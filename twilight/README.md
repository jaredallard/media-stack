<p align="center">
  <img src="https://raw.githubusercontent.com/jaredallard/media-stack/master/.github/twilight.png" alt="Twilight Sparkle with books" />
</p>

<p align="center">
  <code>twilight</code>
</p>

<p align="center">Twilight organizes your media so you don't have too.</p>


## Role

We use Twilight to auto-magickally organize our new media. Twilight exposes a
HTTP service on `:8001` with the following endpoints:

  * **POST** `/v1/media` - create new media
  * **PUT** `/v1/media/:id` - add new files to this media

An example flow:


1. **POST** `/v1/media` with body:
```js
  {
    id: <trello card id>,
    files: 10,
    name: 'MLP',
    type: 'tv'
  }
```
2. **PUT** `/v1/media/<trello card id>` 10 times with each file `multipart/form-data` with file as `file` or with all 10 under `files`
3. Media is sorted and placed in the correct directoy, and renamed based on rule-sets.


## Configuration

Coming soon...

## License

MIT
