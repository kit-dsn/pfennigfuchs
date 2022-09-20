% Release Management

# How to do a release?

gitlab will automatically push a release to
[tes](https://tes.dsn.kastel.kit.edu/) after an appropriate tag has
been pushed. The tag in particular must be an annotated tag. This
requires to use the `-a` option with `git tag`, e.g.:

    git tag -a release/v23.42

A regular expression will match the tag name and is defined in
`.gitlab-ci.yml` as follows:

    /release\/v\d+(\.\d+)*/

After pushing the tag (with `git push --tags`), one can observe the CI
pipeline working on this particular tag and executing two additional
stages: *release* and *deploy*. After the *deploy* stage has finished,
the release should be available on
[tes](https://tes.dsn.kastel.kit.edu/).

The tag information will automatically be spliced into the application
and can be observed in the footer of the login page. A quick check
after a release might be warranted.

