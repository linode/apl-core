## Contributing

Thank you for your interest in contributing to this GitLab project! We welcome
all contributions. By participating in this project, you agree to abide by the
[code of conduct](#code-of-conduct).

## Developer Certificate of Origin + License

By contributing to GitLab B.V., You accept and agree to the following terms and
conditions for Your present and future Contributions submitted to GitLab B.V.
Except for the license granted herein to GitLab B.V. and recipients of software
distributed by GitLab B.V., You reserve all right, title, and interest in and to
Your Contributions. All Contributions are subject to the following DCO + License
terms.

[DCO + License](https://gitlab.com/gitlab-org/dco/blob/master/README.md)

_This notice should stay as the first item in the CONTRIBUTING.md file._

## Merge requests

We welcome merge requests with fixes and improvements to GitLab code, tests,
and/or documentation. The issues that are specifically suitable for
community contributions are listed with the label
[`Accepting Merge Requests` on our issue tracker][accepting-mrs], but you are
free to contribute to any other issue you want.

Please note that if an issue is marked for the current milestone either before
or while you are working on it, a team member may take over the merge request
in order to ensure the work is finished before the release date.

If you want to add a new feature that is not labeled it is best to first create
a feedback issue (if there isn't one already) and leave a comment asking for it
to be marked as `Accepting Merge Requests`.

Merge requests should be opened at [GitLab.com][gitlab-mr-tracker].

### Merge request guidelines

If you can, please submit a merge request with the fix or improvements
including tests. If you don't know how to fix the issue but can write a test
that exposes the issue we will accept that as well. In general bug fixes that
include a regression test are merged quickly while new features without proper
tests are least likely to receive timely feedback. The workflow to make a merge
request is as follows:

1. Fork the project into your personal space on GitLab.com
1. Create a feature branch, branch away from `master`
1. Write code and charts changes.
1. If deemed necessary, provide MR to the [Cloud Native GitLab containers][CNG].
    - Provide the related Issue and MR link from that repository.
1. [Generate a changelog entry with `bin/changelog`][changelog]
1. If you have multiple commits please combine them into a few logically
  organized commits by [squashing them][git-squash]
1. Push the commit(s) to your fork
1. Submit a merge request (MR) to the `master` branch
  1. Your merge request needs at least 1 approval but feel free to require more.
    For instance if you're touching multiple charts, replacing a provider, or
    altering an behavior on a global level.
  1. You don't have to select any approvers, but you can if you really want
    specific people to approve your merge request.
1. The MR title should describe the change you want to make
1. The MR description should give a motive for your change and the method you
   used to achieve it.
  1. If you are contributing code, fill in the template already provided in the
     "Description" field.
  1. If you are contributing documentation, choose `Documentation` from the
     "Choose a template" menu and fill in the template.
  1. Mention the issue(s) your merge request solves, using the `Solves #XXX` or
    `Closes #XXX` syntax to auto-close the issue(s) once the merge request will
    be merged.
1. If you're allowed to, set a relevant milestone and labels
1. Be prepared to answer questions and incorporate feedback even if requests
   for this arrive weeks or months after your MR submission
  1. If a discussion has been addressed, select the "Resolve discussion" button
    beneath it to mark it resolved.
1. When writing commit messages please follow
   [these](http://tbaggery.com/2008/04/19/a-note-about-git-commit-messages.html)
   [guidelines](http://chris.beams.io/posts/git-commit/).

Please keep the change in a single MR **as small as possible**. If you want to
contribute a large feature think very hard what the minimum viable change is.
Can you split the functionality? Can you do part of the refactor? The increased
reviewability of small MRs that leads to higher code quality is more important
to us than having a minimal commit log. The smaller an MR is the more likely it
is it will be merged (quickly). After that you can send more MRs to enhance it.
The ['How to get faster PR reviews' document of Kubernetes](https://github.com/kubernetes/community/blob/master/contributors/devel/faster_reviews.md) also has some great points regarding this.

For examples of feedback on merge requests please look at already
[closed merge requests][closed-merge-requests].
Please ensure that your merge request meets the contribution acceptance criteria.

### Contribution acceptance criteria

1. The change is as small as possible
1. If you suspect a failing CI build is unrelated to your contribution, you may
   try and restart the failing CI job or ask a developer to fix the
   aforementioned failing test
1. Your MR initially contains a single commit (please use `git rebase -i` to
   squash commits)
1. Your changes can merge without problems (if not please rebase if you're the
   only one working on your feature branch, otherwise, merge `master`)
1. Does not break any existing functionality
1. Fixes one specific issue or implements one specific feature (do not combine
   things, send separate merge requests if needed)
1. Keeps the GitLab chart clean and well structured
1. Contains functionality we think other users will benefit from too
1. Changes do not adversely degrade configuration experience.
    - If a change would affect the experience of a user of this chart by increased
      complexity, at install or re-configuration, a strong case must be presented.
1. Changes do not adversely degrade performance.
    - Performance within the chart refers to several factors, the most
      significant being installation and restart times.
1. Changes after submitting the merge request should be in separate commits
   (no squashing).
1. It conforms to the [developer documentation](doc/development/README.md).
1. The merge request meets the [definition of done](#definition-of-done).

## Definition of done

If you contribute to GitLab please know that changes involve more than just
code. We have the following [definition of done][definition-of-done]. Please ensure you support
the feature you contribute through all of these steps.

1. Description explaining the relevancy (see following item)
1. Working and clean code that is commented where needed
1. Deployment and QA pass on the CI cluster
1. Performance/scalability implications have been considered, addressed, and tested
1. Documented in the `/doc` directory
1. [Changelog entry added][changelog], if necessary
1. Reviewed and any concerns are addressed
1. Merged by a project maintainer
1. Added to the release blog article, if relevant
1. Added to [the website](https://gitlab.com/gitlab-com/www-gitlab-com/), if relevant
1. Community questions answered
1. Answers to questions radiated (in docs/wiki/support etc.)

## Code of conduct

As contributors and maintainers of this project, we pledge to respect all people
who contribute through reporting issues, posting feature requests, updating
documentation, submitting pull requests or patches, and other activities.

We are committed to making participation in this project a harassment-free
experience for everyone, regardless of level of experience, gender, gender
identity and expression, sexual orientation, disability, personal appearance,
body size, race, ethnicity, age, or religion.

Examples of unacceptable behavior by participants include the use of sexual
language or imagery, derogatory comments or personal attacks, trolling, public
or private harassment, insults, or other unprofessional conduct.

Project maintainers have the right and responsibility to remove, edit, or reject
comments, commits, code, wiki edits, issues, and other contributions that are
not aligned to this Code of Conduct. Project maintainers who do not follow the
Code of Conduct may be removed from the project team.

This code of conduct applies both within project spaces and in public spaces
when an individual is representing the project or its community.

Instances of abusive, harassing, or otherwise unacceptable behavior can be
reported by emailing contact@gitlab.com.

This Code of Conduct is adapted from the [Contributor Covenant][contributor-covenant], version 1.1.0,
available at [http://contributor-covenant.org/version/1/1/0/](http://contributor-covenant.org/version/1/1/0/).

[accepting-mrs]: https://gitlab.com/charts/gitlab/issues?label_name=Accepting+Merge+Requests
[gitlab-mr-tracker]: https://gitlab.com/charts/gitlab/merge_requests
[closed-merge-requests]: https://gitlab.com/charts/gitlab/merge_requests?assignee_id=&label_name=&milestone_id=&scope=&sort=&state=closed
[contributor-covenant]: http://contributor-covenant.org
[changelog]: doc/development/changelog.md "Generate a changelog entry"
[git-squash]: https://git-scm.com/book/en/Git-Tools-Rewriting-History#Squashing-Commits
[definition-of-done]: http://guide.agilealliance.org/guide/definition-of-done.html
[contributor-covenant]: http://contributor-covenant.org
[CNG]: https://gitlab.com/gitlab-org/build/CNG/
