# NOTICE: This project is not dead, it was moved

**See [tritonmedia](https://github.com/tritonmedia)**. It was moved to get out of a mono-repo and be better organized.


# Media Stack

A pipeline to allow media processing.


## Services / Libraries

  * [API](./api) - Allows you to view statistics about the media, i.e processing status
  * [Deploy](./deploy) - Handles orchestration of Digital Ocean instances
  * [Events](./events) - Queues media and orchestrates new media into the pipeline
  * [Converter](./converter) - Converts media (may change w/ deploy)
  * [Twilight](./twilight) - Organizes and deploys new media. Runs on storage host.
  * [Beholder](./beholder) - Watches over the platform (metrics and etc)

## Setup

**THIS IS LOSELY WRITTEN AND MAY NOT REFLECT FINAL PRODUCT**

 * Pull the repo down on a server `git clone <url> --recursive`
 * Edit `config/config.yaml` to reflect various keys / server locations.


```bash
docker-compose up
```

:tada:

## Production

If you want to use this in production I highly recommend you setup a GCP instance
or a [rancher](https://rancher.com) instance in the cloud with Kubernetes.

Please configure the following labels on your nodes / rancher hosts:

```bash
triton.role:  bigdata (for converter)
triton.role:  storage (for whatever machine has the emby volume on it)
triton.state: stable  (for whatever machine has internet)
```

Modify `.ops/values.yaml` to reflect the external IP you have.

Then install our helm chart: `cd .ops; helm install --name media media-stack`

## License

BSD-3-Clause
