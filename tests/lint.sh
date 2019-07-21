helmfile repos
helmfile -e dev lint --skip-deps
helmfile -e tst lint --skip-deps
helmfile -e acc lint --skip-deps
helmfile -e prd lint --skip-deps
