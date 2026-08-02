# Recover the default-branch lineage without rewriting history

The current `main` snapshot starts at orphan commit `df1caa1269c4d66b4467904f8343d045dc9e4f81`. The previous 321-commit lineage remains reachable through `8e940469aff16a9b38186116e2d288b5acaeb7f9`, whose tree matches the orphan snapshot. Restore the relationship with a merge commit; never force-push, rebase or amend Lovable-published history.

## Preferred sequence

Perform this while the Phase 7 file changes are on a local feature branch and before opening its pull request:

```sh
git fetch origin main
git fetch origin 8e940469aff16a9b38186116e2d288b5acaeb7f9
git diff --quiet \
  df1caa1269c4d66b4467904f8343d045dc9e4f81 \
  8e940469aff16a9b38186116e2d288b5acaeb7f9
git merge --allow-unrelated-histories --no-ff -s ours \
  8e940469aff16a9b38186116e2d288b5acaeb7f9 \
  -m "Restore ParkPunkt repository lineage"
git log --graph --oneline --decorate -n 20
```

The `git diff --quiet` command must exit successfully. If it does not, stop: the historical tip and orphan snapshot are not the expected identical trees. After the merge, push the feature branch normally and merge it through the protected pull-request flow.

## Acceptance evidence

- The pull request contains the Phase 7 file changes and the history-restoration merge commit.
- `git merge-base --is-ancestor 8e940469aff16a9b38186116e2d288b5acaeb7f9 main` succeeds after merge.
- The current source tree remains unchanged apart from the reviewed Phase 7 patch.
- CI, CodeQL and dependency review are green.
