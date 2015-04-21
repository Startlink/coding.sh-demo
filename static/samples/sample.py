import sys
r = lambda: sys.stdin.readline()
d = dict()
n = int(r())
for i in xrange(n):
    a = r().strip()
    b = a.split(' ')
    m = len(b)
    for i in xrange(1,m):
        d[b[i].lower()] = b[0]
r()
import re
while True:
    a = r().strip()
    if not a:
        break
    a = re.sub('[^A-Za-z\'\- ]',' ',a)
    b = a.split(' ')
    for x in b:
        if x.lower() in d:
            print d[x.lower()]
            break
