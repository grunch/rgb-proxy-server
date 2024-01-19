# RGB proxy server

## We are moving!
This repository is now deprecated and will be archived soon. Please refer to the new repository at [https://github.com/RGB-Tools/rgb-proxy-server](https://github.com/RGB-Tools/rgb-proxy-server)

![workflow](https://user-images.githubusercontent.com/31323835/172648333-efd666c0-d8c3-48d8-b290-117c590c684c.png)

RGB proxy server is intended to facilitate the relay of client-side data
between RGB wallets, enabling a better user experience for wallet users.

The API it implements adheres to the
[RGB HTTP JSON-RPC protocol](https://github.com/RGB-Tools/rgb-http-json-rpc).

The proxy server is designed to handle the following workflow:

- The payer of an RGB transfer posts the transfer
  consignment file to the server, typically using the blinded UTXO (provided
  by the payee in the invoice) as identifier for the file.
- The payee asks the server for the consignment file associated with the
  identifier (e.g. the blinded UTXO).
- If there is a file associated to the provided identifier, the server returns
  the file to the payee.
- The payee validates the retrieved consignment file.
- If the consignment is valid, the payee posts an ACK to the server, otherwise
  a NACK is posted to inform the payer that the RGB transfer should be
  considered as failed.
- The payer asks the server for the ACK/NACK status associated with the
  previously posted consignment file. If the consignment has been ACKed by the
  payee, the payer will proceed with broadcasting the Bitcoin transaction
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

## Example usage

The payee generates an RGB invoice and sends it to the payer (not covered
here). Let's assume the invoice contains the blinded UTXO `blindTest`.

The payer prepares the transfer, then sends the consignment file and the
related txid to the proxy server, using the blinded UTXO from the invoice as
identifier:
```
# let's create a fake consignment file and send it
$ echo "consignment binary data" > consignment.rgb
$ curl -X POST -H 'Content-Type: multipart/form-data' \
  -F 'jsonrpc=2.0' -F 'id="1"' -F 'method=consignment.post' \
  -F 'params[recipient_id]=blindTest' -F 'params[txid]=527f2b2ebb81c873f128848d7226ecdb7cb4a4025222c54bfec7c358d51b9207' -F 'file=@consignment.rgb' \
  localhost:3000/json-rpc

{"jsonrpc":"2.0","id":"1","result":true}
```

The payee requests the consignment for the blinded UTXO:
```
$ curl -X POST -H 'Content-Type: application/json' \
  -d '{"jsonrpc": "2.0", "id": "2", "method": "consignment.get", "params": {"recipient_id": "blindTest"} }' \
  localhost:3000/json-rpc

{"jsonrpc":"2.0","id":"2","result": {"consignment": "Y29uc2lnbm1lbnQgYmluYXJ5IGRhdGEK", "txid": "527f2b2ebb81c873f128848d7226ecdb7cb4a4025222c54bfec7c358d51b9207"}}

```
The file is returned as a base64-encoded string:
```
$ echo 'Y29uc2lnbm1lbnQgYmluYXJ5IGRhdGEK' | base64 -d
consignment binary data
```

If the consignment is valid, the payee ACKs it:
```
$ curl -X POST -H 'Content-Type: application/json' \
  -d '{"jsonrpc": "2.0", "id": "3", "method": "ack.post", "params": {"recipient_id": "blindTest", "ack": true} }' \
  localhost:3000/json-rpc

{"jsonrpc":"2.0","id":"3","result":true}
```

If the consignment is invalid, the payee NACKs it:
```
$ curl -X POST -H 'Content-Type: application/json' \
  -d '{"jsonrpc": "2.0", "id": "4", "method": "ack.post", "params": {"recipient_id": "blindTest", "ack": false} }' \
  localhost:3000/json-rpc

{"jsonrpc":"2.0","id":"4","result":true}
```

The payer requests the `ack` value (`null` if payee has not called `ack.post`
yet):
```
$ curl -X POST -H 'Content-Type: application/json' \
  -d '{"jsonrpc": "2.0", "id": "5", "method": "ack.get", "params": {"recipient_id": "blindTest"} }' \
  localhost:3000/json-rpc

{"jsonrpc":"2.0","id":"5","result":true}
```

In case of approval the transaction can be broadcast, otherwise the two parties
need to abort the transfer process and start from scratch.

The consignment or media file for any given recipient ID and the related
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
