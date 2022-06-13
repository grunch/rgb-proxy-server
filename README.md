# RGB proxy server

![workflow](https://user-images.githubusercontent.com/31323835/172648333-efd666c0-d8c3-48d8-b290-117c590c684c.png)

RGB proxy server is intended to facilitate the relay of consignment data between RGB wallets, enabeling a better user experience for wallet users. The proxy server is designed to handle the following workflow:

- The payer of an RGB transfer posts to the proxy server the transfer consignemnt file using as identifier of the file the blinded utxo provided by the payee in the invoice.
- The payee asks the proxy server for the cosignment file associated to the blinded utxo previously provided in the invoice.
- If there is a file associated to such blinded utxo, the server returns the file to the payee.
- The payee validates the content of the consignement file.
- The payee posts to the server and ACK message if she is satisfied with the content of the proposed consignemt file, otherwise she can post a NACK message to inform the payer that the RGB transfer should be considered as failed.
- The payer asks the server for the ACK/NACK status associated with the consignment file previoulsy posted. If the consignment as been ACKed by the payee, the payer will proceed in broadcasting the Bitcoin transaction containing the commitment to the RGB consignment.

The RGB proxy server does not need to be trusted by the users as it is only intended to facilitate comunication between wallets. While the server operator can still perform censorhsip attacks towards users, since anyone can deploy a proxy server censorship concerns can be avoided by simply using a different server provider or by self-hosting an istance of the RGB proxy server. Wallets can coordinate on which specific server to use during a payment by sharing the URL or IP address of the server in the invoice.

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
$ curl 'localhost:3000/consignment/blindtest'

{"success":true,"consignment":"Y29uc2lnbm1lbnQgYmluYXJ5IGRhdGEK"}
```

If the payee is ok with the consigment hit the ack POST call with the same blindedutxo

```
$ curl -d "blindedutxo=blindtest" -X POST localhost:3000/ack

{"success":true}
```

If the payee is not ok with the consigment hit the `nack` POST call with the same blindedutxo

```
$ curl -d "blindedutxo=blindtest" -X POST localhost:3000/nack

{"success":true}
```

The payer do a GET /ack with the same blindedutxo, if gets a `ack: true`, can broadcast the transaction, if get `nack: true` they need to negotiate again.

```
$ curl 'localhost:3000/ack/blindtest'

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
