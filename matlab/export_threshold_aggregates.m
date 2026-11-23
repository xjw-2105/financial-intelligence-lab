function export_threshold_aggregates(resultsDir, outputFile)
%EXPORT_THRESHOLD_AGGREGATES Export counts from the nine frozen V3 results.
% The public output omits row identifiers, case attributes and scores.
arguments
    resultsDir (1,1) string
    outputFile (1,1) string
end

features = ["Basic", "Enhanced", "Full"];
models = ["Logistic", "KNN", "RandomForest"];
ageGroups = ["18-29", "30-44", "45-59", "60-100"];
performance = readtable(fullfile(resultsDir, "performance.csv"), TextType="string");
meta = struct( ...
    "schemaVersion", "1.0", ...
    "dataType", "preaggregated_threshold_counts", ...
    "source", "MATLAB R2025b export from the frozen V3 test-score CSVs", ...
    "split", "V3 frozen test (WEEK_NUM 83-91)", ...
    "scoreRule", "positive class 1; predicted positive iff rawScore >= threshold", ...
    "dimensions", struct("sex", ["F", "M"], "operationalAge", ageGroups));

parts = strings(1, numel(features) * numel(models));
position = 0;
for feature = features
    for model = models
        key = feature + "_" + model;
        position = position + 1;
        sourceFile = fullfile(resultsDir, key + "_test.csv");
        options = detectImportOptions(sourceFile, TextType="string");
        options.SelectedVariableNames = ["target", "WEEK_NUM", "sex", "age_group", "Score"];
        rows = readtable(sourceFile, options);
        assert(height(rows) == 50000 && sum(rows.target == 1) == 1054, "Unexpected case counts for %s.", key);
        assert(all(ismember(rows.target, [0, 1])) && all(isfinite(rows.Score)), "Invalid labels or scores for %s.", key);
        assert(all(ismember(rows.sex, ["F", "M"])) && all(ismember(rows.age_group, ageGroups)), "Unexpected groups for %s.", key);
        assert(all(rows.WEEK_NUM >= 83 & rows.WEEK_NUM <= 91), "Unexpected test weeks for %s.", key);

        match = performance.FeatureSet == feature & performance.Model == model & performance.Split == "test";
        fpr10 = performance(match & performance.Rule == "FPR10", :);
        f1 = performance(match & performance.Rule == "F1", :);
        assert(height(fpr10) == 1 && height(f1) == 1, "Missing or duplicate frozen records for %s.", key);
        thresholds = unique([(0:1000) / 1000, fpr10.Threshold, f1.Threshold]);
        assert(thresholds(1) == 0 && thresholds(end) == 1, "Unexpected threshold domain for %s.", key);
        allRows = counts(rows, true(height(rows),1), thresholds);
        k = find(thresholds == fpr10.Threshold, 1);
        matrix = [allRows.TP(k), allRows.FP(k), allRows.negative-allRows.FP(k), allRows.positive-allRows.TP(k)];
        assert(isequal(matrix, [fpr10.TP, fpr10.FP, fpr10.TN, fpr10.FN]), "Frozen FPR10 mismatch for %s.", key);

        groups = strings(1, 7);
        groups(1) = member("All", allRows);
        groups(2) = member("sex:F", counts(rows, rows.sex == "F", thresholds));
        groups(3) = member("sex:M", counts(rows, rows.sex == "M", thresholds));
        for j = 1:numel(ageGroups)
            group = ageGroups(j);
            groups(j+3) = member("age:" + group, counts(rows, rows.age_group == group, thresholds));
        end
        header = struct("model", model, "featureSet", feature, ...
            "sourceFile", "V3/results/" + key + "_test.csv", ...
            "nCases", allRows.n, "positives", allRows.positive, "negativeCases", allRows.negative, ...
            "thresholds", thresholds, ...
            "frozenThresholds", struct("FPR10", fpr10.Threshold, "F1", f1.Threshold), ...
            "frozenMetrics", struct("rocAuc", fpr10.ROCAUC, "averagePrecision", fpr10.AP, "recall", fpr10.Recall, "fpr", fpr10.FPR));
        parts(position) = string(jsonencode(key)) + ":" + appendObject(header, "groups", groups);
        fprintf('%s | thresholds=%d | FPR10=%.17g | TP=%d FP=%d TN=%d FN=%d\n', key, numel(thresholds), fpr10.Threshold, matrix);
    end
end
payload = appendObject(meta, "runs", parts);
[fd, message] = fopen(outputFile, "w", "n", "UTF-8");
assert(fd ~= -1, "%s", message);
cleanup = onCleanup(@() fclose(fd)); %#ok<NASGU>
fprintf(fd, "%s", payload);
fprintf('MATLAB %s | verified all nine frozen confusion matrices\n', version);
end

function result = counts(rows, include, thresholds)
target = rows.target(include);
score = rows.Score(include);
edges = [thresholds, Inf];
positive = target == 1;
% histcounts uses left-inclusive bins. Summing from the right keeps all
% scores tied at the threshold in the predicted-positive class.
tp = fliplr(cumsum(fliplr(histcounts(score(positive), edges))));
fp = fliplr(cumsum(fliplr(histcounts(score(~positive), edges))));
result = struct("n", numel(target), "positive", nnz(positive), ...
    "negative", nnz(~positive), "TP", tp, "FP", fp);
end

function output = member(key, value)
output = string(jsonencode(key)) + ":" + string(jsonencode(value));
end

function out = appendObject(header, key, members)
encoded = string(jsonencode(header));
out = extractBefore(encoded, strlength(encoded)) + "," + string(jsonencode(key)) + ":{" + join(members, ",") + "}}";
end
