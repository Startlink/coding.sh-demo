#include <cstdio>
#include <set>
using namespace std;
int main() {
    int n;
    scanf("%d",&n);
    int x;
    set<int>s;
    for (int i=0; i<n; i++) {
        scanf("%d",&x);
        s.insert(x);
    }
    scanf("%d",&x);
    int ans = 0;
    for (int y : s) {
        if (2*y == x) continue;
        if (s.count(x-y)) ans += 1;
    }
    printf("%d\n",ans/2);
    return 0;
}
