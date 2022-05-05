# RGB proxy server

![workflow](workflow.jpg)

## Running the app

```
# install dependencies
npm install

# run in dev mode on port 3000
npm run dev

# generate production build
npm run build

# run generated content in dist folder on port 3000
npm run start
```
## How to use it
The payer send the consignment file to the API
```
# let's create a fake consignment file and send it
$ echo "consignment binary data" > consignment.rgb
$ curl -X POST -F 'consignment=@consignment.rgb' -F 'blindedutxo=blindtest' localhost:3000/consignment

{"success":true}
```
The payee look for the file
```
$ curl 'localhost:3000/consignment?blindedutxo=blindtest'

{"success":true,"consignment":"Y29uc2lnbm1lbnQgYmluYXJ5IGRhdGEK"}
```
If the payee is ok with the consigment hit the ack POST call with the same blindedutxo
```
$ curl -d "blindedutxo=blindtest" -X POST localhost:3000/ack

{"success":true}
```
The payer do a GET /ack with the same blindedutxo, if gets a `ack: true`, can broadcast the transaction.
```
$ curl 'localhost:3000/ack?blindedutxo=blindtest'

{"success":true,"ack":true}
```
## Testing

### Jest with supertest

```
npm run test
```

## Linting

```
# run linter
npm run lint

# fix lint issues
npm run lint:fix
```
