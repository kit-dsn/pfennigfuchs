import json
import numpy
for n in range(3,21):
    with open(f"src/data/glpk-n{n}.json") as f:
        data = numpy.array(json.load(f)).astype(numpy.float)
        result = []
        for i in range(len(data)):
            result.append([str(i), str(numpy.round(sum(data[i,:]) - sum(data[:,i]), 2))])
    with open(f"src/data/patcas-n{n}.json", "w") as f:
        json.dump(result,f)
print("done")