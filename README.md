# :fox_face: Pfennigfuchs

Pfennigfuchs is a social networking web application which allows its users to keep track
and settle shared expenses. It is designed to use existing infrastructure, in particular
the federated Matrix instant messaging system, to leverage existing social network
relationships to make its use ubiquitous among peer groups. By building upon the
Matrix protocol, Pfennigfuchs inherits the federated nature of Matrix. The project was
carried out as part of a student project with the aim of developing a webapp for the management
of shared expenses on the basis of the matrix protocol.

## Features

- Matrix authentication and synchronization
- Dashboard provides quick overview of expenses per room
- recording and listing of shared expenses per room
- displaying of balances per room
- minimizing number of transactions or amount of in-flight transaction volume depending on room complexity
- manages display names, avatars, and payment information per user
- manages name, avatar, and description per room
- provides contact list to quickly create new rooms with already known contacts
- Pfennigfuchs managed rooms are organized in a space and don't clutter your room arrangement
- installable as PWA on Chrome and supports native notifications

## Installation

### Try Pfennigfuchs locally

```shell
npm i
npm run build
npm run preview
```

The web application is locally available on port **5050**.

### Install on a web server

```
npm i
npm run build
```

Finally, publish the content of the resulting dist/ directory.

### Hidden features

- `/perftest` provides a benchmark framework for the optimization algorithms
- pressing the key `v` in the settlement tab lists results of all optimizations
- appending `/debug` to a room in the URL displays the raw state PF has about the room in JSON


## Contributing students:
- Jens Greiner
- Lorenz Maier
- Marwin Jannik Hartmut Kadner (@kadma:matrix.org)
- Tim
