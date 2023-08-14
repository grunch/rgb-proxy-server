# RGB proxy server

![workflow](https://user-images.githubusercontent.com/31323835/172648333-efd666c0-d8c3-48d8-b290-117c590c684c.png)

RGB proxy server is intended to facilitate the relay of consignment data
between RGB wallets, enabling a better user experience for wallet users.

The API it implements adheres to the
[RGB HTTP JSON-RPC protocol](https://github.com/RGB-Tools/rgb-http-json-rpc).

The proxy server is designed to handle the following workflow:

- The payer of an RGB transfer posts to the proxy server the transfer
  consignment file using as identifier of the file the blinded UTXO provided by
  the payee in the invoice.
- The payee asks the proxy server for the consignment file associated to the
  blinded UTXO previously provided in the invoice.
- If there is a file associated to such blinded UTXO, the server returns the
  file to the payee.
- The payee validates the content of the consignment file.
- The payee posts to the server and ACK message if she is satisfied with the
  content of the proposed consignment file, otherwise she can post a NACK
  message to inform the payer that the RGB transfer should be considered as
  failed.
- The payer asks the server for the ACK/NACK status associated with the
  consignment file previously posted. If the consignment as been ACKed by the
  payee, the payer will proceed in broadcasting the Bitcoin transaction
  containing the commitment to the RGB consignment.

The RGB proxy server does not need to be trusted by the users as it is only
intended to facilitate communication between wallets.
Anyone can deploy an RGB proxy server instance, so while the server operator
can still perform censorship attacks towards users, concerns can be avoided by
simply using a different server provider or by self-hosting an instance.

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

The payee generates a blinded UTXO and sends it to the payer (not covered
here). Let's assume the blinded UTXO is `blindTest`.

The payer sends the consignment file for the blinded UTXO to the proxy server:
```
# let's create a fake consignment file and send it
$ echo "consignment binary data" > consignment.rgb
$ curl -X POST -H 'Content-Type: multipart/form-data' \
  -F 'jsonrpc=2.0' -F 'id="3"' -F 'method=consignment.post' \
  -F 'params[recipient_id]=blindTest' -F 'params[txid]=txid' -F 'file=@consignment.rgb' \
  localhost:3000/json-rpc

{"jsonrpc":"2.0","id":"3","result":true}
```

The payee requests the consignment for the blinded UTXO:
```
$ curl -X POST -H 'Content-Type: application/json' \
  -d '{"jsonrpc": "2.0", "id": "7", "method": "consignment.get", "params": {"recipient_id": "blindTest"} }' \
  localhost:3000/json-rpc

{"jsonrpc":"2.0","id":"7","result": {"consignment": "Y29uc2lnbm1lbnQgYmluYXJ5IGRhdGEK", "txid": "aTxid"}}

```
The file is returned as a base64-encoded string:
```
$ echo 'Y29uc2lnbm1lbnQgYmluYXJ5IGRhdGEK' | base64 -d
consignment binary data
```

If ok with the consignment (validation passes), the payee calls:
```
$ curl -X POST -H 'Content-Type: application/json' \
  -d '{"jsonrpc": "2.0", "id": "9", "method": "ack.post", "params": {"recipient_id": "blindTest", "ack": true} }' \
  localhost:3000/json-rpc

{"jsonrpc":"2.0","id":"9","result":true}
```

If not ok with the consignment, the payee calls instead:
```
$ curl -X POST -H 'Content-Type: application/json' \
  -d '{"jsonrpc": "2.0", "id": "8", "method": "ack.post", "params": {"recipient_id": "blindTest", "ack": false} }' \
  localhost:3000/json-rpc

{"jsonrpc":"2.0","id":"8","result":true}
```

The payer recieves the `ack` value (`null` if payee has not called `ack.post`
yet):
```
$ curl -X POST -H 'Content-Type: application/json' \
  -d '{"jsonrpc": "2.0", "id": "1", "method": "ack.get", "params": {"recipient_id": "blindTest"} }' \
  localhost:3000/json-rpc

{"jsonrpc":"2.0","id":"1","result":true}
```

In case of approval the transaction can be broadcast, otherwise the two parties
need to abort the transfer process and start from scratch.

The consignment or media file for any given blinded UTXO and the related
approval cannot be changed once submitted.


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
