# %%
import rasterio
import pandas as pds
import numpy as np
import numpy.ma as ma

from sklearn.pipeline import Pipeline
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
from sklearn.decomposition import PCA

import matplotlib.pyplot as plt
import seaborn

# %%
HI_RES = '30s'
LOW_RES = '10m'

INCLUDE_VARS = [1,2,3,4,5,6,7,10,11]
vlab = ['meanT', 'diT', 'isoT', 'seaT', '+monT', '-monT', 'range', 'mean+Q', 'mean-Q']

def print_matrix(M, rlab=None, clab=None):
    t = '\t'
    if clab:
        print('', end=t)
        for cl in clab:
            print(cl, end=t)
        print('')
    for ir, r in enumerate(M):
        if rlab:
            print(f'{rlab[ir]}', end=t)
        for ic, c in enumerate(r):
            print(f'{c:.2f}' if abs(c) > 0 else '', end=t)
        print('')

def read_band(path):
    with rasterio.open(path) as file:
        return file.read(1, masked=True).ravel()

def build_matrix(res, varnums):
    features = [read_band(f'./_data/wc2.1_{res}/bio_{num}.tif') for num in varnums]
    return ma.mask_rows(ma.vstack(features).transpose())

# %%
raw_rows = build_matrix(LOW_RES, INCLUDE_VARS)
compressed = ma.compress_rows(raw_rows)

corr = np.corrcoef(compressed, rowvar=False)
cov = np.cov(compressed, rowvar=False)
# %%
scaler = StandardScaler()
scaled = scaler.fit_transform(compressed)
df = pds.DataFrame(scaled, columns=vlab)

# %%
pca = PCA(n_components=2)
df = pds.DataFrame(pca.fit_transform(scaled), columns=['pc1','pc2'])

# %%
kmeans = KMeans(n_clusters=8, random_state=3)
df['group'] = kmeans.fit_predict(df[['pc1', 'pc2']])
seaborn.jointplot(data=df, x='pc1', y='pc2', hue='group', kind='kde')


