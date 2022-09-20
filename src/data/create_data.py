import json
import numpy

for n in range(3,21):
    with open(f"src/data/glpk-n{n}.json", "w") as f:
        data = numpy.round(-5 + numpy.random.rand(n,n) * 20, 2).astype(str)
        for i in range(n):
            data[i][i] = "0"
        print(data.tolist())
        json.dump(data.tolist(), f)