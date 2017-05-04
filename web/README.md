# Horizon PMU UI

## pre-reqs: latest node or : 6.9.4

```JavaScript
$ npm install
$ npm start
```

## Deployment

```JavaScript
$ npm run build
$ docker build -t summit.hovitos.engineering/x86/horizon/afg-pmu-ui:volcanostaging .
$ docker push summit.hovitos.engineering/x86/horizon/afg-pmu-ui:volcanostaging
```

In the meantime, make sure you have the proper `/src/constants/config.js` file before running `$ npm build`.

This currently is:
```JavaScript
export const wsURL = 'wss://staging.bluehorizon.network:8080/stream/data'
```