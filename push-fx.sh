cd /workspaces/fursatnew && git pull
BASE=42fceae
git merge-base --is-ancestor $BASE HEAD || { echo "STOP: HEAD does not contain $BASE"; exit 1; }
git diff --quiet && git diff --cached --quiet || { echo "STOP: tracked files have uncommitted changes"; exit 1; }
for Z in FX1-final FX2-final-fixed; do
  test -f $Z.zip || { echo "STOP: $Z.zip not found in $(pwd)"; exit 1; }
  rm -rf /tmp/$Z && mkdir /tmp/$Z && unzip -oq $Z.zip -d /tmp/$Z && rm -f $Z.zip
  (cd /tmp/$Z/site && find . -type f | sed "s|^\./||") | while read f; do
    case "$f" in *.webp|*.jpg|*.png|*.mp4|*.webm|*.woff2|*.svg|*.mp3) mkdir -p "$(dirname "$f")"; cp "/tmp/$Z/site/$f" "$f"; continue;; esac
    if git cat-file -e "$BASE:$f" 2>/dev/null && [ -f "$f" ]; then git show "$BASE:$f" > /tmp/b.tmp; git merge-file "$f" /tmp/b.tmp "/tmp/$Z/site/$f" || { echo "CONFLICT $f ($Z)"; exit 1; }
    else mkdir -p "$(dirname "$f")"; cp "/tmp/$Z/site/$f" "$f"; fi
  done
  echo "== $Z deletions:"
  sed "s#^site/##" /tmp/$Z/DELETE-LIST.txt | grep -v "^none$" | grep -v "^$" | while read d; do git rm -q --ignore-unmatch -- "$d" && echo "  rm $d"; done
  if [ "$Z" = "FX2-final-fixed" ]; then
    sed -i "/class=\"sh-card\"/ s#alt=\"\" width=\"112\"#alt=\"\" aria-hidden=\"true\" width=\"112\"#" src/components/SiteHeader.astro
  fi
  git add -A && git commit -q -m "$Z" && echo "committed $Z"
done
grep -rq "<<<<<<<" src public && { echo "STOP: conflict markers"; exit 1; } || true
grep -rIl "sreemukhi" src public scripts 2>/dev/null | head -3
npm run build
npm run check:seo
git add -A && { git diff --cached --quiet || git commit -q -m "rebuild generated files"; }
git log --oneline | head -4
echo "READY. If everything above looks right, run: git push"
