"""
This is a full custom build script because npm is very slow.
It use a custom cache system (it's literally just zipped node_modules)

Requires:
- Python 3.6+
- 7zip in path

---

MIT License

Copyright (c) 2020-2021 ihateani.me

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
"""

import argparse
import hashlib
import json
import os
import pathlib
import shutil
import sys

parser = argparse.ArgumentParser(prog="ihaapiBuildTools")
parser.add_argument("-D", "--dry-run", action="store_true", dest="dried", help="Dry run the program")
args = parser.parse_args()


def cache_path():
    base_home = os.path.expanduser("~")
    if os.name == "nt":
        return os.path.join(base_home, "AppData", "Local", "ihaAPI_npmcache")
    return os.path.join(base_home, ".ihaapi_npmcache")


def read_json(path):
    with open(path, "r", encoding="utf-8") as fp:
        return json.load(fp)


def hash_contents(contents: dict):
    encoded = json.dumps(contents, ensure_ascii=False).encode("utf-8")
    h = hashlib.sha256()
    h.update(encoded)
    return h.hexdigest()


def run_build_and_restart():
    print("==> Running build script")
    os.system("npm run build")
    print("==> Restarting pm2 process...")
    os.system("pm2 restart --silent ihaAPI")
    print("==> Build created and process has been restarted!")


_FILE_PATH = str(pathlib.Path(__file__).parent.absolute())
_PARENT_PATH = os.path.join(_FILE_PATH, "..")
_PACKAGE_LOCK = os.path.join(_PARENT_PATH, "package-lock.json")
_PACKAGE = os.path.join(_PARENT_PATH, "package.json")
_NODE_MODULES = os.path.join(_PARENT_PATH, "node_modules")
_CACHE_PATHS = cache_path()

print("==> Reading package-lock.json")
_PACKAGE_LOCK_CONTENTS = read_json(_PACKAGE_LOCK)
_PACKAGE_LOCK_REQUIRE = {
    "packages": _PACKAGE_LOCK_CONTENTS["packages"],
    "dependencies": _PACKAGE_LOCK_CONTENTS["dependencies"]
}
print("==> Reading package.json")
_PACKAGE_CONTENTS = read_json(_PACKAGE)

print("==> Hashing dependencies data")
_PACKAGE_DEPS = {**_PACKAGE_CONTENTS["devDependencies"], **_PACKAGE_CONTENTS["dependencies"]}
_HASH_PACKAGE = hash_contents(_PACKAGE_DEPS)
_HASH_LOCKFILE = hash_contents(_PACKAGE_LOCK_REQUIRE)

_CACHE_NAME = f"npmcache_{_HASH_LOCKFILE}_{_HASH_PACKAGE}.7z"

print(f"==> package.json: {_HASH_PACKAGE}")
print(f"==> package-lock.json: {_HASH_LOCKFILE}")

if not os.path.isdir(_CACHE_PATHS) and not args.drieds:
    os.makedirs(_CACHE_PATHS)

_CACHE_FILES = os.path.join(_CACHE_PATHS, _CACHE_NAME)
print(f"==> Checking for cache: {_CACHE_NAME}")
if not os.path.isfile(_CACHE_FILES):
    print("==> No cache files, running npm ci")
    os.chdir(_PARENT_PATH)
    if not args.dried:
        os.system("npm ci")
        run_build_and_restart()
    print("==> Caching files...")
    if not args.dried:
        os.system(f"7z a \"{_CACHE_FILES}\" \"{_NODE_MODULES}\"")
        sys.exit(0)

print("==> Cache found, removing node_modules folder if exist!")
if os.path.isdir(_NODE_MODULES) and not args.dried:
    shutil.rmtree(_NODE_MODULES)

os.chdir(_PARENT_PATH)
print("==> Extracting contents of the cache files")
if not args.dried:
    os.system(f"7z x \"{_CACHE_FILES}\"")
    run_build_and_restart()
