# 🤖 Bot Detection Testing & Self-Improvement Framework

**Version:** 1.0.0  
**Purpose:** Progressive bot detection testing with self-diagnostic and improvement capabilities  
**Target:** Reddit automation and general anti-detection mastery

---

## 📚 Detection Site Database

### Level 1: Basic Detection (Easy) 🟢

#### **bot.sannysoft.com**
- **Difficulty:** 2/10
- **Tests:** ~15 basic checks
- **Focus Areas:**
  - `navigator.webdriver` presence
  - User-Agent string (HeadlessChrome)
  - Missing Chrome objects (`chrome.app`, `chrome.csi`)
  - WebDriver-specific properties
  - Plugins availability
  - Languages consistency
  
- **Success Criteria:** All checks should show GREEN
- **Common Failures:**
  - Red: `navigator.webdriver = true`
  - Red: User-Agent contains "HeadlessChrome"
  - Red: Missing `window.chrome` object
  - Red: No plugins detected

- **Quick Fixes:**
  ```javascript
  // Inject before page load
  Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
  window.chrome = { runtime: {} };
  ```

---

#### **pixelscan.net**
- **Difficulty:** 3/10  
- **Tests:** Basic fingerprinting + WebRTC leaks
- **Focus Areas:**
  - Canvas fingerprinting basics
  - WebGL renderer detection
  - WebRTC IP leak
  - Font detection
  - Screen resolution consistency

- **Success Criteria:** 
  - "Authenticity: High" or "Medium"
  - No WebRTC leaks
  - Fingerprint looks "natural"

- **Common Failures:**
  - WebRTC leaking real IP
  - Canvas fingerprint too similar to known bots
  - Screen resolution doesn't match user agent

- **Quick Fixes:**
  - Disable WebRTC: `--disable-features=WebRTC`
  - Add canvas noise injection
  - Match viewport to realistic device dimensions

---

### Level 2: Intermediate Detection (Medium) 🟡

#### **bot.incolumitas.com**
- **Difficulty:** 6/10
- **Tests:** 50+ comprehensive checks
- **Focus Areas:**
  - **Behavioral Classification Score** (0-1 scale)
    - Mouse movements
    - Scroll patterns
    - Interaction timing
    - Click accuracy
  - CDP Runtime.enable detection
  - Advanced fingerprinting (Canvas, WebGL, Audio)
  - HTTP header analysis
  - TCP/IP fingerprinting
  - TLS fingerprinting

- **Success Criteria:**
  - Behavioral Score > 0.7
  - Pass all "New Detection Tests"
  - Complete the Bot Challenge form

- **Common Failures:**
  - Low behavioral score (< 0.5) → Mechanical movements
  - CDP Runtime.enable detected
  - Missing browser features
  - HTTP header inconsistencies

- **Moderate Fixes:**
  - Implement human-like mouse movements (Bezier curves)
  - Use rebrowser-patches to disable Runtime.enable
  - Add random delays between actions (1-3 seconds)
  - Scroll with variable speeds
  - Generate realistic HTTP headers

---

#### **browserscan.net**
- **Difficulty:** 7/10
- **Tests:** Robot detection + Fingerprint authenticity
- **Focus Areas:**
  - WebDriver protocol detection
  - Automation tool signatures (Selenium, Puppeteer, Playwright)
  - Browser property deception
  - User behavior patterns
  - Advanced fingerprint consistency

- **Success Criteria:**
  - "No bots detected"
  - Fingerprint Authenticity > 90%
  - Browser/OS correctly identified

- **Common Failures:**
  - "Malicious bots" detected (Puppeteer/Playwright signature)
  - Fingerprint authenticity < 70%
  - Inconsistent navigator properties
  - Missing plugin details

- **Moderate Fixes:**
  - Use rebrowser-patches or puppeteer-real-browser
  - Implement comprehensive fingerprint spoofing
  - Add noise to Canvas/WebGL/Audio
  - Match all navigator properties to target device

---

### Level 3: Advanced Detection (Hard) 🔴

#### **abrahamjuliot.github.io/creepjs**
- **Difficulty:** 8/10
- **Tests:** 100+ deep fingerprinting vectors
- **Focus Areas:**
  - **Trust Score** (percentage-based)
  - Canvas/WebGL/Audio "lies" detection
  - High-entropy API analysis
  - Worker scope tampering detection
  - Crowd-blending assessment
  - Request header mismatches
  - Browser prediction accuracy

- **Success Criteria:**
  - Trust Score > 65%
  - Minimal "lies" detected (< 5)
  - Browser correctly predicted
  - Crowd Blending Score acceptable

- **Common Failures:**
  - Trust score < 50%
  - Many "lies" detected (fingerprint inconsistencies)
  - GPU spoofing detected
  - Audio fingerprint too noisy
  - Worker scope tampering

- **Advanced Fixes:**
  - Use real device fingerprints (not generated)
  - Disable canvas noise if causing lies
  - Ensure GPU matches OS/browser combo
  - Use real audio fingerprints
  - Implement worker scope isolation

---

#### **rebrowser-bot-detector (bot-detector.rebrowser.net)**
- **Difficulty:** 9/10
- **Tests:** Modern automation-specific checks
- **Focus Areas:**
  - Runtime.enable CDP detection
  - Puppeteer script source URL
  - Isolated context detection
  - navigator.webdriver bypass verification
  - CSP bypass detection
  - CDP method usage patterns

- **Success Criteria:**
  - Pass all 6-8 core tests
  - Green checkmarks across all categories
  - "Not detected" status

- **Common Failures:**
  - Runtime.enable detected
  - Puppeteer source URL in stack traces
  - Main context script execution
  - CSP bypass enabled

- **Advanced Fixes:**
  - **MUST use rebrowser-patches**
  - Disable Runtime.enable at CDP level
  - Use custom source URLs
  - Run scripts in isolated contexts
  - Disable CSP bypass (`setBypassCSP(false)`)

---

#### **f.vision**
- **Difficulty:** 8/10
- **Tests:** Comprehensive consistency checks
- **Focus Areas:**
  - Cross-API consistency validation
  - Temporal consistency (multiple visits)
  - Hardware-software alignment
  - Behavioral biometrics
  - Network-level fingerprinting

- **Success Criteria:**
  - Consistent fingerprint across visits
  - No contradictions between APIs
  - Natural behavior patterns

- **Common Failures:**
  - Inconsistent fingerprints on reload
  - Hardware doesn't match software claims
  - Network fingerprint mismatch

- **Advanced Fixes:**
  - Use persistent browser profiles
  - Ensure hardware fingerprint matches OS
  - Use consistent proxy/VPN per session

---

### Level 4: Production Systems (Expert) 🔴🔴

#### **Cloudflare Turnstile / Challenge**
- **Difficulty:** 10/10
- **Real-world protection**
- **Focus Areas:**
  - All of the above PLUS
  - Machine learning behavioral models
  - Historical device reputation
  - Network reputation
  - Request timing patterns
  - JavaScript execution analysis

- **Success Criteria:**
  - Pass Turnstile without clicking
  - OR pass with single click
  - Consistent success rate > 80%

- **Requires:**
  - Perfect fingerprint
  - Excellent behavioral score
  - Clean IP reputation
  - Historical "good" behavior
  - May still require human intervention

---

#### **Reddit (Target Platform)**
- **Difficulty:** 6-7/10 (Medium-Hard)
- **Known Detection Methods:**
  - Rate limiting (actions per minute/hour)
  - IP reputation tracking
  - Account age verification
  - Behavioral anomaly detection
  - Cloudflare protection on some endpoints
  - Canvas/WebGL fingerprinting
  - Vote manipulation detection

- **Success Criteria:**
  - Sustain operations for 7+ days
  - No shadowbans or suspensions
  - Natural engagement patterns
  - Authentic karma accumulation

- **Critical Factors:**
  - **Account warming** (gradual activity increase)
  - **Realistic timing** (human browsing patterns)
  - **IP diversity** (residential proxies)
  - **Fingerprint stability** (same device per account)
  - **Content variation** (not copy-paste)

---

## 🎯 Progressive Testing Protocol

### Phase 1: Baseline Assessment

```yaml
Objective: Establish current detection vulnerability
Duration: 30 minutes

Steps:
  1. Test on bot.sannysoft.com
     - Take screenshot
     - Count red flags
     - Note specific failures
  
  2. Test on pixelscan.net
     - Check authenticity score
     - Verify WebRTC status
     - Note fingerprint quality
  
  3. Generate baseline report:
     - Total failures: X/20
     - Critical issues: [list]
     - Priority fixes: [ranked]
```

### Phase 2: Quick Wins

```yaml
Objective: Fix obvious detection vectors
Duration: 1 hour

Priority Fixes:
  1. navigator.webdriver → undefined
  2. User-Agent → Remove HeadlessChrome
  3. Chrome objects → Add window.chrome
  4. Plugins → Populate with fake plugins
  5. WebRTC → Disable or fake local IP
  
Test Again:
  - bot.sannysoft.com should be mostly green
  - pixelscan.net authenticity > 60%
```

### Phase 3: Fingerprint Enhancement

```yaml
Objective: Implement comprehensive fingerprint
Duration: 2-3 hours

Implement:
  1. Canvas noise injection
  2. WebGL parameter spoofing
  3. Audio context fingerprint
  4. Complete navigator properties
  5. Realistic screen/viewport
  6. Timezone consistency
  
Test on:
  - browserscan.net
  - bot.incolumitas.com (score > 0.5)
```

### Phase 4: Behavioral Refinement

```yaml
Objective: Pass behavioral analysis
Duration: Ongoing

Implement:
  1. Ghost-cursor (human-like mouse)
  2. Variable typing speed
  3. Random scroll patterns
  4. Natural delay ranges
  5. Bezier curve movements
  
Test on:
  - bot.incolumitas.com (score > 0.7)
  - Complete Bot Challenge successfully
```

### Phase 5: Advanced Evasion

```yaml
Objective: Beat sophisticated detectors
Duration: 4+ hours

Implement:
  1. Rebrowser patches
  2. Isolated context execution
  3. Custom CDP source URLs
  4. Worker scope protection
  5. Temporal consistency
  
Test on:
  - rebrowser-bot-detector (all green)
  - creepjs (trust > 65%)
  - f.vision (consistent fingerprint)
```

### Phase 6: Reddit Validation

```yaml
Objective: Verify production readiness
Duration: 7 days

Reddit-Specific Tests:
  1. Create test accounts (3-5)
  2. Run controlled automation:
     - Browse 10 posts/day
     - Upvote 5 posts/day
     - Comment 1-2 times/day
  3. Monitor for:
     - Shadowbans
     - Rate limit errors
     - CAPTCHA challenges
     - Account warnings
  
Success Metrics:
  - Zero suspensions after 7 days
  - Natural karma growth
  - No CAPTCHA challenges
  - Smooth voting/commenting
```

---

## 🔍 Self-Diagnostic Methodology

### When Test Fails

```python
def diagnose_failure(test_site, failure_details):
    """
    Systematic failure analysis
    """
    
    # 1. Categorize the failure
    categories = {
        'navigator_properties': ['webdriver', 'plugins', 'languages'],
        'fingerprint_inconsistency': ['canvas', 'webgl', 'audio', 'fonts'],
        'behavioral': ['mouse', 'scroll', 'timing', 'clicks'],
        'network': ['headers', 'ip', 'tcp', 'tls'],
        'automation_signature': ['cdp', 'puppeteer', 'selenium']
    }
    
    # 2. Identify root cause
    root_causes = analyze_error_patterns(failure_details)
    
    # 3. Check fix database
    known_fixes = query_fix_database(root_causes)
    
    # 4. Attempt automated fix
    if known_fixes['confidence'] > 0.8:
        apply_fix(known_fixes['solution'])
        return retest()
    
    # 5. If fix confidence < 0.8 or retry fails
    else:
        return generate_research_prd(failure_details)
```

### Automated Fix Attempts

```yaml
Attempt Fixes When:
  - Failure is well-documented
  - Fix has > 80% success rate
  - No risk of making it worse
  - Can be easily reverted

Max Retry Attempts: 3

After 3 failures:
  → Generate PRD for human research
```

---

## 🛠️ Fix Strategy Database

### Category: Navigator Properties

| Issue | Detection Site | Fix | Confidence | Code Snippet |
|-------|---------------|-----|------------|--------------|
| navigator.webdriver = true | All | Delete property | 95% | `delete navigator.webdriver;` |
| Missing chrome object | Sannysoft | Add fake chrome | 90% | `window.chrome = { runtime: {} };` |
| Headless user agent | All | Replace UA | 95% | `--user-agent="Mozilla/5.0..."` |
| No plugins | Sannysoft | Add fake plugins | 85% | `Object.defineProperty(navigator, 'plugins', ...)` |

### Category: Fingerprint Consistency

| Issue | Detection Site | Fix | Confidence | Code Snippet |
|-------|---------------|-----|------------|--------------|
| Canvas lies detected | CreepJS | Use real fingerprint | 70% | Disable noise, use genuine |
| WebGL inconsistency | BrowserScan | Match GPU to OS | 65% | Ensure vendor/renderer align |
| Audio too noisy | CreepJS | Reduce noise level | 60% | Lower noise variance |
| Font list mismatch | All | Match OS fonts | 75% | Use real OS font list |

### Category: Behavioral Patterns

| Issue | Detection Site | Fix | Confidence | Code Snippet |
|-------|---------------|-----|------------|--------------|
| Low behavior score | Incolumitas | Add ghost-cursor | 80% | `import ghostCursor; ghostCursor.move()` |
| Linear movements | All | Bezier curves | 85% | `generateBezierPath(start, end)` |
| Fixed timing | All | Random delays | 90% | `sleep(random(1000, 3000))` |
| No scroll variance | All | Random scroll heights | 85% | `scrollBy(random(200, 400))` |

### Category: Automation Signatures

| Issue | Detection Site | Fix | Confidence | Requirement |
|-------|---------------|-----|------------|-------------|
| Runtime.enable detected | Rebrowser | Use rebrowser-patches | 95% | **Required patch** |
| Puppeteer source URL | Rebrowser | Custom source URL | 90% | Rebrowser patches |
| Main context execution | Rebrowser | Isolated contexts | 85% | Rebrowser patches |
| CSP bypass detected | Rebrowser | Disable setBypassCSP | 95% | `setBypassCSP(false)` |

---

## 📝 PRD Generation Template

When automated fixes fail after 3 attempts, generate this PRD:

```markdown
# Bot Detection Failure Research & Resolution Plan

## Executive Summary
- **Detection Site:** [site name]
- **Failure Type:** [category]
- **Severity:** [Critical/High/Medium]
- **Auto-fix Attempts:** 3 (all failed)
- **Estimated Research Time:** [hours]

## Failure Details

### What Happened
[Detailed description of the failure]

### Screenshot Evidence
[Paths to screenshots]

### Error Messages
```
[Exact error messages or failed checks]
```

### Current Configuration
```yaml
Browser: Chrome 134
Framework: Chrome DevTools MCP + Browserless
Fingerprint Profile: [profile_id]
Proxy: [type and location]
```

## Root Cause Analysis

### Known Issues
1. [Issue 1 with confidence level]
2. [Issue 2 with confidence level]

### Unknowns
- [What we don't understand]
- [Gaps in knowledge]

## Research Plan

### Phase 1: Information Gathering (2 hours)
- [ ] Search for similar issues on GitHub
- [ ] Check Rebrowser/Puppeteer discussions
- [ ] Review recent CreepJS updates
- [ ] Analyze DataDome blog posts
- [ ] Check bot detection academic papers

### Phase 2: Experimental Testing (3 hours)
- [ ] Test with puppeteer-real-browser
- [ ] Test with rebrowser-patches
- [ ] Test with different fingerprint profiles
- [ ] Test with different Chrome versions
- [ ] Test with different proxy types

### Phase 3: Solution Implementation (2 hours)
- [ ] Document findings
- [ ] Implement proposed solution
- [ ] Verify on failing detection site
- [ ] Regression test on previously passing sites
- [ ] Update fix database

## Proposed Solutions (Ranked)

### Option 1: [Solution Name]
- **Likelihood of Success:** [%]
- **Implementation Effort:** [Low/Medium/High]
- **Risk:** [Low/Medium/High]
- **Steps:**
  1. [Step 1]
  2. [Step 2]

### Option 2: [Alternative Solution]
- **Likelihood of Success:** [%]
- **Implementation Effort:** [Low/Medium/High]
- **Risk:** [Low/Medium/High]

## Resources Needed
- [ ] Research time: X hours
- [ ] Testing accounts: X accounts
- [ ] Proxy budget: $X
- [ ] Potential paid tools: [list]

## Success Criteria
- [ ] Pass [detection site] consistently
- [ ] No regression on other sites
- [ ] Reddit operations unaffected
- [ ] Solution is maintainable

## Timeline
- Research: [date range]
- Implementation: [date range]  
- Testing: [date range]
- Deployment: [date]

---
**Generated by:** Bot Detection Testing Skill v1.0  
**Date:** [timestamp]  
**Operator:** [human name]
```

---

## 🚀 Usage Instructions for Agent

### Initial Setup

```bash
# 1. Start with basic configuration
export DETECTION_TEST_MODE=true
export MAX_AUTO_FIX_ATTEMPTS=3

# 2. Create testing directory
mkdir -p ~/bot-detection-tests
cd ~/bot-detection-tests

# 3. Initialize log file
echo "Bot Detection Testing Log - $(date)" > test_log.txt
```

### Progressive Test Execution

```python
# Pseudocode for agent

async def run_progressive_tests():
    """
    Execute tests in order of difficulty
    """
    
    test_sequence = [
        ('bot.sannysoft.com', 'Level 1', auto_fix=True),
        ('pixelscan.net', 'Level 1', auto_fix=True),
        ('bot.incolumitas.com', 'Level 2', auto_fix=True),
        ('browserscan.net', 'Level 2', auto_fix=True),
        ('creepjs', 'Level 3', auto_fix=False),  # Manual review
        ('rebrowser-bot-detector', 'Level 3', auto_fix=False),
        ('reddit.com', 'Level 4', auto_fix=False)
    ]
    
    for site, level, auto_fix in test_sequence:
        print(f"\n{'='*60}")
        print(f"Testing: {site} ({level})")
        print(f"{'='*60}\n")
        
        result = await test_site(site)
        
        if result.passed:
            print(f"✅ PASSED: {site}")
            continue
        
        if auto_fix and result.confidence > 0.8:
            print(f"🔧 Attempting auto-fix...")
            for attempt in range(3):
                await apply_fix(result.issue, result.fix)
                retry = await test_site(site)
                
                if retry.passed:
                    print(f"✅ FIXED: {site} (attempt {attempt+1})")
                    break
            else:
                print(f"⚠️ Auto-fix failed after 3 attempts")
                generate_prd(site, result)
        
        else:
            print(f"📋 Generating research PRD...")
            generate_prd(site, result)
            
            # Wait for human intervention
            print(f"\n🚦 PAUSED: Human research required for {site}")
            print(f"📄 PRD saved to: prd_{site}_{timestamp}.md")
            
            # Do not proceed to next level until current is fixed
            break
```

### Continuous Monitoring

```yaml
Schedule:
  Daily:
    - Quick test on bot.sannysoft.com
    - Log any regressions
  
  Weekly:
    - Full test suite (all sites)
    - Generate trend report
    - Update fix database
  
  Monthly:
    - Deep dive on new detection methods
    - Update fingerprint profiles
    - Refresh proxy pool
```

---

## 📊 Success Metrics

### Short-term (1 week)
- ✅ Pass bot.sannysoft.com consistently
- ✅ Pass pixelscan.net (authenticity > 80%)
- ✅ Pass bot.incolumitas.com (score > 0.7)

### Medium-term (1 month)
- ✅ Pass browserscan.net consistently  
- ✅ Pass creepjs (trust > 65%)
- ✅ Pass rebrowser-bot-detector (all tests)
- ✅ Reddit operations: 7+ days no issues

### Long-term (3 months)
- ✅ Cloudflare Turnstile bypass rate > 80%
- ✅ Reddit operations: 90+ days sustainable
- ✅ Multiple accounts maintained successfully
- ✅ Zero shadowbans or suspensions

---

## 🔄 Continuous Improvement

### Learning from Failures

```python
def update_fix_database(failure, solution, success):
    """
    Learn from each iteration
    """
    
    fix_database.add({
        'issue': failure.description,
        'site': failure.site,
        'solution': solution.code,
        'success_rate': success.rate,
        'confidence': calculate_confidence(success),
        'last_updated': timestamp(),
        'notes': solution.lessons_learned
    })
    
    if success.rate > 0.8:
        # Promote to auto-fix
        auto_fix_enabled[failure.type] = True
```

### Stay Updated

```yaml
Monitor These Resources:
  Weekly:
    - github.com/rebrowser/rebrowser-patches
    - github.com/abrahamjuliot/creepjs
    - datadome.co/blog
  
  Monthly:
    - Chrome DevTools Protocol updates
    - Browser fingerprinting research papers
    - Anti-bot vendor security updates
    
  Quarterly:
    - Major browser version releases
    - New detection techniques
    - Automation framework updates
```

---

## 🎓 Key Learnings & Best Practices

### 1. Fingerprint Consistency is King
- Use real device fingerprints, not generated ones
- Keep fingerprint stable per account
- Match all properties to a single device type

### 2. Behavioral Patterns Matter Most
- Bot detection is increasingly behavioral
- Invest in natural mouse/keyboard simulation
- Variable timing is critical

### 3. Network Layer is Often Overlooked
- TCP/IP fingerprint must match OS
- TLS fingerprint must match browser
- HTTP headers must be complete and consistent

### 4. Context Isolation is Essential
- Use rebrowser-patches for modern detection
- Isolated contexts prevent leakage
- CDP method detection is real

### 5. Reddit-Specific Wisdom
- Account age > immediate success
- Start slow, scale gradually
- Residential IPs are worth the cost
- Content quality > quantity

---

## 📞 Human Escalation Triggers

**Auto-generate PRD when:**
1. ❌ Failed 3 auto-fix attempts
2. ❌ Confidence level < 80% for available fixes
3. ❌ New detection method not in database
4. ❌ Regression on previously passing site
5. ❌ Reddit account suspended/shadowbanned

**Immediate human alert when:**
1. 🚨 All Level 1 tests failing
2. 🚨 Reddit operations blocked
3. 🚨 IP range banned
4. 🚨 Cloudflare constantly challenging

---

**End of Skill**  
**Version:** 1.0.0  
**Last Updated:** 2025-01-XX  
**Maintainer:** Your Bot Detection Research Team