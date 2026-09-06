import re, urllib.request, concurrent.futures, html
source=open('lib/study.ts').read()
items=re.findall(r'^([^\n|`]+)\|(\d+)\|(\d+)',source,re.M)
# Include the first row of each literal.
items+=re.findall(r'parse\(`([^\n|]+)\|(\d+)\|(\d+)',source)
def check(item):
 name,pid,level=item
 try:
  req=urllib.request.Request('https://school.programmers.co.kr/learn/courses/30/lessons/'+pid,headers={'User-Agent':'Mozilla/5.0'})
  body=urllib.request.urlopen(req,timeout=20).read().decode()
  title=html.unescape(re.search(r'<title>(.*?)</title>',body,re.S).group(1)).strip()
  return None if name in title else (pid,name,title)
 except Exception as e:return (pid,name,str(e))
with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
 errors=[x for x in pool.map(check,items) if x]
print({'checked':len(items),'mismatches_or_errors':errors})
