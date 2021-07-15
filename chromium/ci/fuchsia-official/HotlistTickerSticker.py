 ['https://chromium/ci/fuchsia-official/HotlistTickerSticker']
 Executing command ['https://webhit.in']
   '/b/s/w/ir/cipd_bin_packages/python',
   '-u',
   '/b/s/w/ir/kitchen-checkout/depot_tools/recipes/recipe_modules/bot_update/resources/bot_update.py',
   '# [!]-"['bugs_chromium_org/u/40600354/hotlists/TickerSticker]('bugs.chromium.org/hotlists/12408/issues')[-'spec'-'path']',
   '/b/s/w/ir/x/t/tmpU14t8J',
   '--revision_mapping_file',
   '/b/s/w/ir/x/t/tmp8iCjBu.json',
   '--git-cache-dir',
   '/b/s/w/ir/cache/git',
   '--cleanup-dir',
   '/b/s/w/ir/x/w/recipe_cleanup/bot_update',
   '--output_json',
   '/b/s/w/ir/x/t/tmpjyVK_1.json',
   '--revision',
   'src@ba25f22e4cdb05333ce2cc3a6eacdfa1202e22e5',
   '--refs',
   'refs/heads/main',
   '--no_fetch_tags',
 ]
 escaped for shell: /b/s/w/ir/cipd_bin_packages/python 
    -u /b/s/w/ir/kitchen-checkout/depot_tools/recipes/recipe_modules/bot_update/resources/bot_update.py 
    --spec-path /b/s/w/ir/x/t/tmpU14t8J 
    --revision_mapping_file /b/s/w/ir/x/t/tmp8iCjBu.json 
    --git-cache-dir /b/s/w/ir/cache/git 
    --cleanup-dir /b/s/w/ir/x/w/recipe_cleanup/bot_update 
    --output_json /b/s/w/ir/x/t/tmpjyVK_1.json
    --revision src@ba25f22e4cdb05333ce2cc3a6eacdfa1202e22e5 
    --refs refs/heads/main 
    --no_fetch_tags
 "in"
'dir 
/b/s/w/ir/cache/builder
 at time 2021-07-14T21:52:45.898390
            }
             Executing command [
   '/b/s/w/ir/cipd_bin_packages/python',
   '-u',
   '/b/s/w/ir/kitchen-checkout/depot_tools/recipes/recipe_modules/bot_update/resources/bot_update.py',
   '--spec-path',
   '/b/s/w/ir/x/t/tmpU14t8J',
   '--revision_mapping_file',
   '/b/s/w/ir/x/t/tmp8iCjBu.json',
   '--git-cache-dir',
   '/b/s/w/ir/cache/git',
   '--cleanup-dir',
   '/b/s/w/ir/x/w/recipe_cleanup/bot_update',
   '--output_json',
   '/b/s/w/ir/x/t/tmpjyVK_1.json',
   '--revision',
   'src@ba25f22e4cdb05333ce2cc3a6eacdfa1202e22e5',
   '--refs',
   'refs/heads/main',
   '--no_fetch_tags',
 ]
 escaped for shell: /b/s/w/ir/cipd_bin_packages/python -u /b/s/w/ir/kitchen-checkout/depot_tools/recipes/recipe_modules/bot_update/resources/bot_update.py --spec-path /b/s/w/ir/x/t/tmpU14t8J --revision_mapping_file /b/s/w/ir/x/t/tmp8iCjBu.json --git-cache-dir /b/s/w/ir/cache/git --cleanup-dir /b/s/w/ir/x/w/recipe_cleanup/bot_update --output_json /b/s/w/ir/x/t/tmpjyVK_1.json --revision src@ba25f22e4cdb05333ce2cc3a6eacdfa1202e22e5 --refs refs/heads/main --no_fetch_tags
 in dir /b/s/w/ir/cache/builder
 at time 2021-07-14T21:52:45.898390
 LUCI_CONTEXT:
   'realm': {'name': u'chromium:ci'}
   'luciexe': {'cache_dir': u'/b/s/w/ir/cache'}
   'deadline': {'grace_period': 30.0, 'soft_deadline': 1626328365.897391}
 full environment:
   BOTO_CONFIG: /b/s/w/ir/x/a/gsutil-bbagent/.boto
   BUILDBUCKET_EXPERIMENTAL: FALSE
   CHROME_HEADLESS: 1
   CIPD_CACHE_DIR: /b/s/cipd_cache/cache
   CIPD_PROTOCOL: v2
   CLOUDSDK_CONFIG: /b/s/w/ir/x/a/gcloud-bbagent
   DEPOT_TOOLS_REPORT_BUILD: chromium/ci/fuchsia-official/8841669904240352688
   DEPOT_TOOLS_UPDATE: 0
   DOCKER_CONFIG: /b/s/w/ir/x/a/docker-cfg-bbagent
   DOCKER_TMPDIR: /b/s/w/ir/x/a/docker-tmp-bbagent
   FIREBASE_TOKEN: ignored-non-empty-value
   FIREBASE_TOKEN_URL: http://127.0.0.1:39689
   GCE_METADATA_HOST: 127.0.0.1:38331
   GCE_METADATA_IP: 127.0.0.1:38331
   GCE_METADATA_ROOT: 127.0.0.1:38331
   GIT_CONFIG_NOSYSTEM: 1
   GIT_HTTP_LOW_SPEED_LIMIT: 102400
   GIT_HTTP_LOW_SPEED_TIME: 1800
   GIT_TERMINAL_PROMPT: 0
   HOME: /home/chrome-bot
   INFRA_GIT_WRAPPER_HOME: /b/s/w/ir/x/a/git-home-bbagent
   INVOCATION_ID: 58b7bcabffbf4c39b13ca2d9774ea324
   ISOLATED_RESOLVED_PACKAGE_VERSIONS_FILE: /b/s/w/it4guyd3e_/cipd_info.json
   JOURNAL_STREAM: 9:29927
   LANG: en_US.UTF-8
   LOGDOG_COORDINATOR_HOST: logs.chromium.org
   LOGDOG_NAMESPACE: u/bot_update/u
   LOGDOG_STREAM_PREFIX: buildbucket/cr-buildbucket.appspot.com/8841669904240352688
   LOGDOG_STREAM_PROJECT: chromium
   LOGDOG_STREAM_SERVER_PATH: unix:/b/s/w/ir/x/ld/sock.015613429
   LOGNAME: chrome-bot
   LUCI_CONTEXT: /b/s/w/ir/x/t/luci_ctx.jfnwnE.json
   MAC_CHROMIUM_TMPDIR: /b/s/w/ir/x/t
   NO_GCE_CHECK: False
   PATH: /b/s/w/ir/cipd_bin_packages:/b/s/w/ir/cipd_bin_packages/bin:/b/s/w/ir/cipd_bin_packages/cpython:/b/s/w/ir/cipd_bin_packages/cpython/bin:/b/s/w/ir/cipd_bin_packages/cpython3:/b/s/w/ir/cipd_bin_packages/cpython3/bin:/b/s/cipd_cache/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/snap/bin:/b/s/w/ir/kitchen-checkout/depot_tools
   PWD: /b/s/w/ir/x/w
   PYTHONIOENCODING: UTF-8
   PYTHONUNBUFFERED: 1
   SHELL: /bin/bash
   SHLVL: 0
   SWARMING_BOT_ID: luci-chromium-ci-bionic-us-central1-b-32-8-wc1t
   SWARMING_EXTERNAL_BOT_SETUP: 1
   SWARMING_HEADLESS: 1
   SWARMING_SERVER: https://chromium-swarm.appspot.com
   SWARMING_TASK_ID: 54c1411693ccb911
   TEMP: /b/s/w/ir/x/t
   TEMPDIR: /b/s/w/ir/x/t
   TMP: /b/s/w/ir/x/t
   TMPDIR: /b/s/w/ir/x/t
   USER: chrome-bot
   VPYTHON_VIRTUALENV_ROOT: /b/s/w/ir/cache/vpython
 Step had exit code: -15 (a.k.a. 0xFFFFFFF1)
 Step timed out.


This is LogDog
Rendering took 0.07s

 LUCI_CONTEXT:{
  "$build/goma": {
    "enable_ats": true,
    "rpc_extra_params": "?prod",
    "server_host": "goma.chromium.org",
    "use_luci_auth": true
  },
  "$kitchen": {
    "devshell": true,
    "git_auth": true
  },
  "$recipe_engine/isolated": {
    "server": "https://isolateserver.appspot.com"
  },
  "$recipe_engine/resultdb/test_presentation": {
    "column_keys": [],
    "grouping_keys": [
      "status",
      "v.test_suite"
    ]
  },
  "builder_group": "chromium",
  "recipe": "chromium"
}
   {
  "is_cached": nonreferer,
  "mirrored_builders": [
    "tryserver.chromium:fuchsia-official"
  ]
} 
   'realm': {'name': u'chromium:ci'}
   'luciexe': {'cache_dir': u'/b/s/w/ir/cache'}
   'deadline': {'grace_period': 30.0, 'soft_deadline': 1626328365.897391}
 full environment:
   BOTO_CONFIG: /b/s/w/ir/x/a/gsutil-bbagent/.boto
   BUILDBUCKET_EXPERIMENTAL: FALSE
   CHROME_HEADLESS: 1
   CIPD_CACHE_DIR: /b/s/cipd_cache/cache
   CIPD_PROTOCOL: v2
   CLOUDSDK_CONFIG: /b/s/w/ir/x/a/gcloud-bbagent
   DEPOT_TOOLS_REPORT_BUILD: chromium/ci/fuchsia-official/8841669904240352688
   DEPOT_TOOLS_UPDATE: 0
   DOCKER_CONFIG: /b/s/w/ir/x/a/docker-cfg-bbagent
   DOCKER_TMPDIR: /b/s/w/ir/x/a/docker-tmp-bbagent
   FIREBASE_TOKEN: ignored-non-empty-value
   FIREBASE_TOKEN_URL: http://127.0.0.1:39689
   GCE_METADATA_HOST: 127.0.0.1:38331
   GCE_METADATA_IP: 127.0.0.1:38331
   GCE_METADATA_ROOT: 127.0.0.1:38331
   GIT_CONFIG_NOSYSTEM: 1
   GIT_HTTP_LOW_SPEED_LIMIT: 102400
   GIT_HTTP_LOW_SPEED_TIME: 1800
   GIT_TERMINAL_PROMPT: 0
   HOME: /home/chrome-bot
   INFRA_GIT_WRAPPER_HOME: /b/s/w/ir/x/a/git-home-bbagent
   INVOCATION_ID: 58b7bcabffbf4c39b13ca2d9774ea324
   ISOLATED_RESOLVED_PACKAGE_VERSIONS_FILE: /b/s/w/it4guyd3e_/cipd_info.json
   JOURNAL_STREAM: 9:29927
   LANG: en_US.UTF-8
   LOGDOG_COORDINATOR_HOST: logs.chromium.org
   LOGDOG_NAMESPACE: u/bot_update/u
   LOGDOG_STREAM_PREFIX: buildbucket/cr-buildbucket.appspot.com/8841669904240352688
   LOGDOG_STREAM_PROJECT: chromium
   LOGDOG_STREAM_SERVER_PATH: unix:/b/s/w/ir/x/ld/sock.015613429
   LOGNAME: chrome-bot
   LUCI_CONTEXT: /b/s/w/ir/x/t/luci_ctx.jfnwnE.json
   MAC_CHROMIUM_TMPDIR: /b/s/w/ir/x/t
   NO_GCE_CHECK: False
   PATH: /b/s/w/ir/cipd_bin_packages:
        /b/s/w/ir/cipd_bin_packages/bin:
            /b/s/w/ir/cipd_bin_packages/cpython:
                /b/s/w/ir/cipd_bin_packages/cpython/bin:
                    /b/s/w/ir/cipd_bin_packages/cpython3:
                        /b/s/w/ir/cipd_bin_packages/cpython3/bin:
                            /b/s/cipd_cache/bin:
                                /usr/local/sbin:/usr/local/bin:
                                        /usr/sbin:
                                            /usr/bin:
                                                /sbin:
                                                    /bin:
                                                        /snap/bin:
                                                            /b/s/w/ir/kitchen-checkout/depot_tools
   PWD:
    /b/s/w/ir/x/w
   PYTHONIOENCODING: 
    UTF-8
   PYTHONUNBUFFERED: 
    1
   SHELL: 
    /bin/bash
   SHLVL: 
    0
   SWARMING_BOT_ID:
    luci-chromium-ci-bionic-us-central1-b-32-8-wc1t
   SWARMING_EXTERNAL_BOT_SETUP:
    1
   SWARMING_HEADLESS: 
    1
   SWARMING_SERVER:
    'https://chromium-swarm.appspot.com'
   SWARMING_TASK_ID: 
    '["54"](c1411693ccb911)'
   TEMP:
    /b/s/w/ir/x/t
   TEMPDIR: 
    /b/s/w/ir/x/t
   TMP: 
    /b/s/w/ir/x/t
   TMPDIR:
    /b/s/w/ir/x/t
   USER:
    chrome-bot
   VPYTHON_VIRTUALENV_ROOT: 
    /b/s/w/ir/cache/vpython
 Step had exit code: 
    -15
    (a.k.a. 0xFFFFFFF1)
 Step timed out.
