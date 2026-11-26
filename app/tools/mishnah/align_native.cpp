// Equivalent consensus algorithm to align.py; ASCII encodes Hebrew consonants only.
// No anchoring heuristic: all minimum-cost paths over the whole chapter are used.
#include <algorithm>
#include <iostream>
#include <string>
#include <vector>
using namespace std;
struct Word{bool bad; vector<string> keys;};
struct Edge{int i,p,j,q; string kind;};
bool overlap(const vector<string>&a,const vector<string>&b){for(auto&x:a)for(auto&y:b)if(x==y)return true;return false;}
int distance2(const string&a,const string&b){vector<int> row(b.size()+1);for(int j=0;j<(int)row.size();j++)row[j]=j;for(int i=1;i<=(int)a.size();i++){vector<int> r(b.size()+1);r[0]=i;for(int j=1;j<=(int)b.size();j++)r[j]=min({r[j-1]+1,row[j]+1,row[j-1]+(a[i-1]!=b[j-1])});row.swap(r);}return row.back();}
int main(){ios::sync_with_stdio(false);int n,m;if(!(cin>>n>>m))return 1;vector<Word>a(n),b(m);for(auto*v:{&a,&b})for(auto&w:*v){int bad,k;cin>>bad>>k;w.bad=bad;while(k--){string s;cin>>s;w.keys.push_back(s);}}
 auto combined=[](const vector<Word>&v){vector<vector<vector<string>>> c(v.size(),vector<vector<string>>(4));for(int i=0;i<(int)v.size();i++){vector<string> prev={""};for(int z=1;z<=3&&i+z<=(int)v.size();z++){vector<string> next;for(auto&x:prev)for(auto&y:v[i+z-1].keys)next.push_back(x+y);sort(next.begin(),next.end());next.erase(unique(next.begin(),next.end()),next.end());c[i][z]=next;prev=next;}}return c;};
 auto ac=combined(a),bc=combined(b);int width=m+1,size=(n+1)*(m+1);vector<unsigned char> cost(n*m,6);
 for(int i=0;i<n;i++)for(int j=0;j<m;j++){int c=6;if(overlap(a[i].keys,b[j].keys))c=0;else for(auto&x:a[i].keys)for(auto&y:b[j].keys){int hi=max(x.size(),y.size()),lo=min(x.size(),y.size());if(lo<3||hi-lo>2)continue;int d=distance2(x,y);if(d<=2&&double(d)/hi<=.35)c=2;}cost[i*m+j]=c;}
 const int pp[]={1,2,1,3,2,2,3},qq[]={2,1,3,1,2,3,2};
 auto edges=[&](int i,int j,auto callback){if(i<n)callback(1,0,3,"absent");if(j<m)callback(0,1,3,"insertion");if(i<n&&j<m){int c=cost[i*m+j];callback(1,1,c,c==0?"exact":c==2?"form":"unresolved");for(int z=0;z<7;z++){int p=pp[z],q=qq[z];if(i+p<=n&&j+q<=m&&overlap(ac[i][p],bc[j][q]))callback(p,q,1,"joined");}}};
 vector<int>f(size,1000000000),back(size,1000000000);f[0]=0;back[size-1]=0;
 for(int i=0;i<=n;i++)for(int j=0;j<=m;j++)edges(i,j,[&](int p,int q,int c,const char*){int k=(i+p)*width+j+q;f[k]=min(f[k],f[i*width+j]+c);});
 for(int i=n;i>=0;i--)for(int j=m;j>=0;j--)edges(i,j,[&](int p,int q,int c,const char*){back[i*width+j]=min(back[i*width+j],c+back[(i+p)*width+j+q]);});
 vector<int>ca(n),cb(m);vector<Edge>candidates;
 for(int i=0;i<=n;i++)for(int j=0;j<=m;j++)edges(i,j,[&](int p,int q,int c,const char*k){if(f[i*width+j]+c+back[(i+p)*width+j+q]!=f[size-1])return;for(int x=i;x<i+p;x++)ca[x]++;for(int y=j;y<j+q;y++)cb[y]++;candidates.push_back({i,p,j,q,k});});
 for(auto&e:candidates){bool ok=e.kind!="unresolved";for(int i=e.i;i<e.i+e.p;i++)if(ca[i]!=1||a[i].bad)ok=false;for(int j=e.j;j<e.j+e.q;j++)if(cb[j]!=1||b[j].bad)ok=false;
 if(!e.q)for(int j=max(0,e.j-1);j<min(m,e.j+1);j++)if(b[j].bad)ok=false;
 if(!e.p)for(int i=max(0,e.i-1);i<min(n,e.i+1);i++)if(a[i].bad)ok=false;
 if(ok)cout<<e.i<<' '<<e.p<<' '<<e.j<<' '<<e.q<<' '<<e.kind<<'\n';}
}
