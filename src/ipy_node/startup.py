import pandas as pd
from pandas import json
from IPython.display import JSON

def dataframe_json(df):
    data = {}
    for k, v in df.iteritems():
        data[k] = v.values
    data['index'] = df.index
    data['__repr__'] = repr(df)
    return json.dumps(data)

def to_json(obj):
    if isinstance(obj, pd.DataFrame):
        return JSON(dataframe_json(obj))
    return JSON(json.dumps(obj))
