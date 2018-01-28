# Media Stack

A pipeline to allow media processing.


## Services / Libraries

  * [Deploy](./deploy) - Handles orchestration of Digital Ocean instances.
  * [Events](./events) - Queues media and orchestrates new media into the pipeline.
  * [Metrics](./metrics) - Gathers information on the platform and new media.
  * [Converter](./converter) - Converts media (may change w/ deploy)

## Setup

**THIS IS LOSELY WRITTEN AND MAY NOT REFLECT FINAL PRODUCT**

 * Pull the repo down on a server `git clone <url> --recursive`
 * Either:
   * `docker-compose up`
   * Launch containers on separate servers.
 * Edit `config/service.yaml` to reflect various keys / server locations.
 * Upload generated deploy pubkey `./deploy/ssh/key.pub` onto your media server.
 * ... done!

## License

BSD-3-Clause
