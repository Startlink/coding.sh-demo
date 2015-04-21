#include <cstdio>
#include <vector>
#include <cstring>
using namespace std;
int n,m;
bool c[111][111];
int dx[]={0,0,1,-1};
int dy[]={1,-1,0,0};
inline int abs(int x) {
    return x>0?x:-x;
}
bool is_possible(int sx, int sy, int ex, int ey) {
    int diff = abs(sx-ex)+abs(sy-ey);
    diff = diff%2;
    if (n == 2) {
        if (sy == ey) {
            if ((sx == 1 && ex == 2) || (sx == 2 && ex == 1)) {
                if (sy != 1 && sy != m) {
                    return false;
                }
            }
        }
    }
    if (m == 2) {
        if (sx == ex) {
            if ((sy == 1 && ey == 2) || (sy == 2 && ey == 1)) {
                if (sx != 1 && sx != n) {
                    return false;
                }
            }
        }
    }
    return diff == 1;
}
bool go(int x, int y, int ex, int ey, int step) {
    if (x == ex && y == ey) {
        return step == n*m;
    } else {
        for (int k=0; k<4; k++) {
            int nx = x+dx[k];
            int ny = y+dy[k];
            if (nx >= 1 && nx <= n && ny >= 1 && ny <= m && c[nx][ny] == false) {
                c[nx][ny] =true;
                if (go(nx,ny,ex,ey,step+1)) {
                    printf("%d %d\n",nx,ny);
                    return true;
                }
                c[nx][ny] = false;
            }
        }
    }
    return false;
}
int main() {
    int t;
    scanf("%d\n",&t);
    while(t--) {
        scanf("%d %d\n",&n,&m);
        int sx,sy,ex,ey;
        scanf("%d %d\n%d %d",&sx,&sy,&ex,&ey);
        bool possible = is_possible(sx,sy,ex,ey);
        if (!possible) {
            printf("-1\n");
        } else {
            printf("1\n");
            memset(c,false,sizeof(c));
            c[sx][sy] = true;
            go(sx,sy,ex,ey,1);
            printf("%d %d\n",sx,sy);
        }
    }
    return 0;
}
