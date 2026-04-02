import sys
import re

filename = 'src/services/compact/compact.ts'
with open(filename, 'r') as f:
    content = f.read()

# Fix the duplicate block and use savedTokens
pattern = r"""    // Calculate estimated saved tokens
    const estPostTokens = roughTokenCountEstimationForMessages\(\[
      boundaryMarker,
      \.\.\.postCompactFileAttachments,
      \.\.\.hookMessages,
    \]\) \+ roughTokenCountEstimation\(summary \|\| ''\);
    const savedTokens = Math.max\(0, \(preCompactTokenCount \?\? 0\) - estPostTokens\);
    const summaryMessages: UserMessage\[\] = \[
      createUserMessage\(\{
        content: getCompactUserSummaryMessage\(
          summary,
          suppressFollowUpQuestions,
          transcriptPath,
        \),
        isCompactSummary: true,
        isVisibleInTranscriptOnly: true,
        userDisplayMessage: `✨ Compacted session: ~\${formatNumber\(Math.max\(0, \(preCompactTokenCount \?\? 0\) - \(truePostCompactTokenCount \?\? 0\)\)\)\)} tokens saved.`,
      \}\),
    \]"""

replacement = """    // Calculate estimated saved tokens
    const estPostTokens = roughTokenCountEstimationForMessages([
      boundaryMarker,
      ...postCompactFileAttachments,
      ...hookMessages,
    ]) + roughTokenCountEstimation(summary || '');
    const savedTokens = Math.max(0, (preCompactTokenCount ?? 0) - estPostTokens);

    const summaryMessages: UserMessage[] = [
      createUserMessage({
        content: getCompactUserSummaryMessage(
          summary,
          suppressFollowUpQuestions,
          transcriptPath,
        ),
        isCompactSummary: true,
        isVisibleInTranscriptOnly: true,
        userDisplayMessage: `✨ Compacted session: ~${formatNumber(savedTokens)} tokens saved.`,
      }),
    ];"""

# Use regex to replace to handle potential white space differences better
new_content = re.sub(re.escape(re.search(pattern, content).group(0)), replacement, content)

with open(filename, 'w') as f:
    f.write(new_content)
