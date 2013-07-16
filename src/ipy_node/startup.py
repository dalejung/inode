import pandas as pd
from IPython.display import JSON

def to_json(obj):
    if isinstance(obj, pd.DataFrame):
        return JSON(obj.to_json())
