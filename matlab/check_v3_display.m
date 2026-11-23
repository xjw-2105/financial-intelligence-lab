function check_v3_display(resultsDir, researchSrc, evidenceFile)
%CHECK_V3_DISPLAY Recheck V3 display values using frozen scores and the original bootstrap.
arguments
    resultsDir (1,1) string
    researchSrc (1,1) string
    evidenceFile (1,1) string
end
addpath(researchSrc);
performance = readtable(fullfile(resultsDir, "performance.csv"), TextType="string");
reported = readtable(fullfile(resultsDir, "bootstrap_sex_gaps.csv"), TextType="string");
whichPoint = @(T) T.FeatureSet == "Full" & T.Model == "RandomForest" & T.Split == "test" & T.Rule == "FPR10";
p = performance(whichPoint(performance), :);
expected = reported(whichPoint(reported), :);
assert(height(p) == 1 && height(expected) == 2);
file = fullfile(resultsDir, "Full_RandomForest_test.csv");
options = detectImportOptions(file, TextType="string");
options.SelectedVariableNames = ["WEEK_NUM", "target", "sex", "Score"];
rows = readtable(file, options);
replayed = v3_bootstrap(rows, rows.Score, p.Threshold);
assert(isequal(string(replayed.Metric), string(expected.Metric)));
cols = ["Signed_M_minus_F", "SignedLow95", "SignedHigh95"];
assert(max(abs(replayed{:,cols} - expected{:,cols}), [], "all") < 1e-12);
assert(all(replayed.WeekBlocks == 9 & replayed.ValidReplicates == 5000));
point = jsondecode(fileread(evidenceFile));
assert(point.run == "Full_RandomForest" && point.dimension == "sex" && point.rule == "FPR10");
assert(abs(point.threshold - p.Threshold) < 1e-15);
for k = 1:height(replayed)
    metric = lower(string(replayed.Metric(k)));
    interval = point.intervals.(metric);
    assert(max(abs([interval.estimate, interval.low, interval.high] - 100 * replayed{k,cols})) < 1e-10);
    fprintf("%s M-F %.12f pp | 95%% [%.12f, %.12f] pp | %d blocks, %d replicates\n", ...
        upper(metric), interval.estimate, interval.low, interval.high, replayed.WeekBlocks(k), replayed.ValidReplicates(k));
end
positive = rows.target == 1;
prediction = rows.Score >= p.Threshold;
tp = nnz(prediction & positive);
fp = nnz(prediction & ~positive);
fn = nnz(~prediction & positive);
tn = nnz(~prediction & ~positive);
assert(isequal([tp,fp,tn,fn], [333,4188,44758,721]));
fnPrices = [3;15];
current = fp + fnPrices .* fn;
baseline = fnPrices .* nnz(positive);
assert(isequal([current,baseline,current - baseline], [6351,3162,3189;15003,15810,-807]));
fprintf("Full RandomForest FPR10 | TP=%d FP=%d TN=%d FN=%d | exact-equal scores=%d\n", tp, fp, tn, fn, nnz(rows.Score == p.Threshold));
for k = 1:numel(fnPrices)
    fprintf("C_FP=1 C_FN=%d | current=%d baseline=%d difference=%+d\n", fnPrices(k), current(k), baseline(k), current(k)-baseline(k));
end
knn = performance(performance.FeatureSet == "Full" & performance.Model == "KNN" & performance.Split == "test" & performance.Rule == "FPR10", :);
file = fullfile(resultsDir, "Full_KNN_test.csv");
options = detectImportOptions(file);
options.SelectedVariableNames = ["target", "Score"];
rows = readtable(file, options);
positive = rows.target == 1;
equalScore = rows.Score == knn.Threshold;
prediction = rows.Score >= knn.Threshold;
assert(isequal([nnz(equalScore & positive), nnz(equalScore & ~positive)], [50,1375]));
assert(isequal([nnz(prediction & positive), nnz(prediction & ~positive)], [knn.TP,knn.FP]));
fprintf("Full KNN FPR10 | inclusive boundary includes %d tied positives and %d tied negatives\n", nnz(equalScore & positive), nnz(equalScore & ~positive));
fprintf("MATLAB %s | frozen scores and original bootstrap only\n", version);
end
