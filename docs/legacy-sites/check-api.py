import json,urllib.request,urllib.error
url='http://localhost:3000/api/study'
def post(data,origin=None):
 req=urllib.request.Request(url,json.dumps(data).encode(),headers={'Content-Type':'application/json',**({'Origin':origin} if origin else {})})
 try:
  with urllib.request.urlopen(req) as r:return r.status,json.load(r)
 except urllib.error.HTTPError as e:return e.code,e.read().decode()
e={'day':55,'kind':'sql','title':'__verification__','problemId':293261,'minutes':23,'result':'hint','reason':'NULL','idea':'GROUP BY','caution':'one row per fish'}
assert post({'entry':e})[0]==200
rows=json.load(urllib.request.urlopen(url))['entries'];assert next(r for r in rows if r['day']==55 and r['kind']=='sql')==e
e['result']='self';assert post({'entry':e})[0]==200
rows=json.load(urllib.request.urlopen(url))['entries'];assert len([r for r in rows if r['day']==55 and r['kind']=='sql'])==1
assert next(r for r in rows if r['day']==55 and r['kind']=='sql')['result']=='self'
assert post({'entry':{**e,'day':56}})[0]==400
assert post({'entry':{**e,'minutes':-1}})[0]==400
assert post({'entry':{**e,'result':'invalid'}})[0]==400
assert post({'entry':e},'https://invalid.example')[0]==403
assert post({'type':'settings','start':'2026-09-08','reminder':'20:00'})[0]==400
assert post({'type':'settings','start':'2026-09-07','reminder':'29:00'})[0]==400
print('PASS: persisted save/read/update, invalid entry/settings rejection, cross-origin rejection')
