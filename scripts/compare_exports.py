"""Compare all prototype and MATLAB native aggregate fields used by the site."""
import argparse
import hashlib
import json
from pathlib import Path

def compare(reference_path: Path, native_path: Path) -> None:
    reference = json.loads(reference_path.read_bytes())
    native = json.loads(native_path.read_bytes())
    assert reference["runs"].keys() == native["runs"].keys()
    assert reference["dimensions"] == native["dimensions"]
    assert reference["scoreRule"] == native["scoreRule"]
    comparisons = 0
    all_points = 0
    for key, expected in reference["runs"].items():
        actual = native["runs"][key]
        for field in ("model", "featureSet", "sourceFile", "nCases", "positives",
                      "negativeCases", "thresholds", "frozenThresholds", "frozenMetrics"):
            assert expected[field] == actual[field], (key, field)
        assert expected["groups"].keys() == actual["groups"].keys(), key
        for group, stats in expected["groups"].items():
            measured = actual["groups"][group]
            for field in ("n", "positive", "negative", "TP", "FP"):
                assert stats[field] == measured[field], (key, group, field)
            comparisons += len(stats["TP"]) + len(stats["FP"])
        all_points += len(actual["thresholds"])
        print(f"{key}: {len(actual['thresholds'])} exact thresholds × {len(actual['groups'])} groups passed")
    print(f"PASS: {len(native['runs'])} runs; {all_points} run-threshold pairs; {comparisons:,} exact TP/FP comparisons")
    for name, path in (("prototype", reference_path), ("native", native_path)):
        print(f"{name} sha256 {hashlib.sha256(path.read_bytes()).hexdigest()}  {path.name}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("reference", type=Path)
    parser.add_argument("native", type=Path)
    args = parser.parse_args()
    compare(args.reference, args.native)
