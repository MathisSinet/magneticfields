import { ConstantCost, CustomCost, ExponentialCost, FreeCost, LinearCost } from "../api/Costs";
import { Localization } from "../api/Localization";
import { BigNumber } from "../api/BigNumber";
import { theory, QuaternaryEntry } from "../api/Theory";
import { Utils } from "../api/Utils";

var id = "magnetic_fields";
var name = "Magnetic Fields";
var description = "A Custom Theory about magnetic fields.\nVersion 0.1.0";
var authors = "Mathis S.";
var version = 0.1;

const tauRate = 1;
const pubExponent = 0.17;

const mu0 = BigNumber.FOUR * BigNumber.PI * BigNumber.from(1e-7);
const q0 = BigNumber.from(1.602e-19);

const i0 = BigNumber.from(1e-15);
const defaultmass = BigNumber.from(1e-4)

// Debug tools
var debugFlag = 1;
var debugMultUpgrade;
var debugMultResetUpgrade;


var currency;
var quaternaryEntries;
var stage = 1;

var rhodot = BigNumber.ZERO;

var x = BigNumber.ZERO;
var vx = BigNumber.ZERO;
var vz = BigNumber.ZERO;
var vtot = BigNumber.ZERO;

var q = BigNumber.ZERO;
var m = BigNumber.ONE;
var I = BigNumber.ZERO;
var omega = BigNumber.ZERO;
var B = BigNumber.ZERO;

var t = BigNumber.ZERO;
var t_dot = BigNumber.ZERO;
var ts = BigNumber.ZERO;
var C = BigNumber.ZERO;

var resetUpgrade;
var c1, c2, v1, v2, v3, v4, a1, a2, delta;

var achievement1, achievement2;
var chapter1, chapter2;


var numberFormat = (value, decimals) => {
    if (value > BigNumber.from(0.01) || value == BigNumber.ZERO) 
    {
        return value.toString(decimals+1);
    }
    else
    {
        let exp = Math.floor((value*BigNumber.from(1+1e-5)).log10().toNumber());
        let mts = (value * BigNumber.TEN.pow(-exp)).toString(decimals);
        return `${mts}e${exp}`;
    }
}


var resetSimulation = () => {
    ts = BigNumber.ZERO;
    x = BigNumber.ZERO;
    vx = (getV1(v1.level) * getV2(v2.level)) * BigNumber.from("1e-20");
    vz = (getV3(v3.level) * getV4(v4.level)) * BigNumber.from("1e-18");
    vtot = (vx.pow(BigNumber.TWO) + BigNumber.TWO * vz.pow(BigNumber.TWO)).sqrt();
    theory.invalidateQuaternaryValues();
}


var init = () => {
    currency = theory.createCurrency();
    quaternaryEntries = [];

    // Reset simulation
    {
        resetUpgrade = theory.createSingularUpgrade(0, currency, new FreeCost);
        resetUpgrade.getDescription = (_) => "Reset particle";
        resetUpgrade.getInfo = (_) => "Reset the particle to its initial position";
        resetUpgrade.boughtOrRefunded = (_) =>
        {
            resetUpgrade.level = 0;
            resetSimulation();
        }
    }

    ///////////////////
    // Regular Upgrades

    // tvar
    {
        let getDesc = (level) => "\\dot{t}=" + getTdot(level).toString(2);
        tvar = theory.createUpgrade(1, currency, new ExponentialCost(1e10, Math.log2(1e20)));
        tvar.getDescription = (_) => Utils.getMath(getDesc(tvar.level));
        tvar.getInfo = (amount) => Utils.getMathTo(getDesc(tvar.level), getDesc(tvar.level + amount));
        tvar.maxLevel = 16;
    }

    // c1
    {
        let getDesc = (level) => "c_1=" + getC1(level).toString(0);
        c1 = theory.createUpgrade(2, currency, new FirstFreeCost(new ExponentialCost(10, Math.log2(2))));
        c1.getDescription = (_) => Utils.getMath(getDesc(c1.level));
        c1.getInfo = (amount) => Utils.getMathTo(getDesc(c1.level), getDesc(c1.level + amount));
    }

    // c2
    {
        let getDesc = (level) => "c_2=2^{" + level + "}";
        let getInfo = (level) => "c_2=" + getC2(level).toString(0);
        c2 = theory.createUpgrade(3, currency, new ExponentialCost(1e4, Math.log2(100)));
        c2.getDescription = (_) => Utils.getMath(getDesc(c2.level));
        c2.getInfo = (amount) => Utils.getMathTo(getInfo(c2.level), getInfo(c2.level + amount));
    }

    // a1
    {
        let getDesc = (level) => "a_1=" + getA1(level).toString(0);
        a1 = theory.createUpgrade(4, currency, new ExponentialCost(100, Math.log2(20)));
        a1.getDescription = (_) => Utils.getMath(getDesc(a1.level));
        a1.getInfo = (amount) => Utils.getMathTo(getDesc(a1.level), getDesc(a1.level + amount));
    }

    // a2
    {
        let getDesc = (level) => "a_2={1.25}^{" + level + "}";
        let getInfo = (level) => "a_2=" + getA2(level).toString(3);
        a2 = theory.createUpgrade(5, currency, new ExponentialCost(1e4, Math.log2(70)));
        a2.getDescription = (_) => Utils.getMath(getDesc(a2.level));
        a2.getInfo = (amount) => Utils.getMathTo(getInfo(a2.level), getInfo(a2.level + amount));
    }

    // delta
    {
        let getDesc = (level) => "{\\delta}={1.1}^{" + level + "}";
        let getInfo = (level) => "{\\delta}=" + getDelta(level).toString(3);
        delta = theory.createUpgrade(6, currency, new ExponentialCost(1e20, Math.log2(300)));
        delta.getDescription = (_) => Utils.getMath(getDesc(delta.level));
        delta.getInfo = (amount) => Utils.getMathTo(getInfo(delta.level), getInfo(delta.level + amount));
    }

    // v1
    {
        let getDesc = (level) => "v_1=" + getV1(level).toString(0);
        v1 = theory.createUpgrade(7, currency, new ExponentialCost(50, Math.log2(80)));
        v1.getDescription = (_) => Utils.getMath(getDesc(v1.level));
        v1.getInfo = (amount) => Utils.getMathTo(getDesc(v1.level), getDesc(v1.level + amount));
    }

    // v2
    {
        let getDesc = (level) => "v_2={1.3}^{" + level + "}";
        let getInfo = (level) => "v_2=" + getV2(level).toString(3);
        v2 = theory.createUpgrade(8, currency, new ExponentialCost(1e4, 4.5*Math.log2(10)));
        v2.getDescription = (_) => Utils.getMath(getDesc(v2.level));
        v2.getInfo = (amount) => Utils.getMathTo(getInfo(v2.level), getInfo(v2.level + amount));
    }

    // v3
    {
        let getDesc = (level) => "v_3=" + getV3(level).toString(0);
        v3 = theory.createUpgrade(9, currency, new ExponentialCost(1e50, Math.log2(70)));
        v3.getDescription = (_) => Utils.getMath(getDesc(v3.level));
        v3.getInfo = (amount) => Utils.getMathTo(getDesc(v3.level), getDesc(v3.level + amount));
    }

    // v4
    {
        let getDesc = (level) => "v_4={1.5}^{" + level + "}";
        let getInfo = (level) => "v_4=" + getV4(level).toString(3);
        v4 = theory.createUpgrade(10, currency, new ExponentialCost(1e55, 6*Math.log2(10)));
        v4.getDescription = (_) => Utils.getMath(getDesc(v4.level));
        v4.getInfo = (amount) => Utils.getMathTo(getInfo(v4.level), getInfo(v4.level + amount));
    }

    /////////////////////
    // Permanent Upgrades
    theory.createPublicationUpgrade(0, currency, 1e7);
    theory.createBuyAllUpgrade(1, currency, 1e10);
    theory.createAutoBuyerUpgrade(2, currency, 1e15);

    if (debugFlag)
    {
        debugMultUpgrade = theory.createPermanentUpgrade(3, currency, new ConstantCost(BigNumber.from(0.01)));
        debugMultUpgrade.getDescription = (_) => "Testing : dt multiplier : " + getDebugMult(debugMultUpgrade.level).toString(0);
        debugMultUpgrade.maxLevel = 100;
        
        debugMultResetUpgrade = theory.createPermanentUpgrade(4, currency, new FreeCost);
        debugMultResetUpgrade.getDescription = (_) => "Reset the testing dt multiplier";
        debugMultResetUpgrade.boughtOrRefunded = (_) =>
        {
            debugMultUpgrade.level = 0;
            debugMultResetUpgrade.level = 0;
        }
    }

    ///////////////////////
    //// Milestone Upgrades
    const milestoneArray = [20, 50, 75, 100, 125, 150, 175, 200, 250, -1]
    theory.setMilestoneCost(new CustomCost((lvl) => tauRate * BigNumber.from(milestoneArray[Math.min(lvl, 9)])));

    {
        velocityTerm = theory.createMilestoneUpgrade(0, 1);
        velocityTerm.description = Localization.getUpgradeAddTermDesc("v");
        velocityTerm.info = Localization.getUpgradeAddTermInfo("v");
        velocityTerm.canBeRefunded = (_) => (vExp.level == 0);
        velocityTerm.boughtOrRefunded = (_) => {
            updateC();
            theory.invalidatePrimaryEquation();
            theory.invalidateSecondaryEquation();
            theory.invalidateQuaternaryValues();
            updateAvailability();
        }
    }

    {
        deltaVariable = theory.createMilestoneUpgrade(1, 1);
        deltaVariable.description = Localization.getUpgradeAddTermDesc("\\delta");
        deltaVariable.info = Localization.getUpgradeAddTermInfo("\\delta");
        deltaVariable.boughtOrRefunded = (_) => {
            theory.invalidateTertiaryEquation();
            updateAvailability();
        }
    }

    {
        xExp = theory.createMilestoneUpgrade(2, 2);
        xExp.description = Localization.getUpgradeIncCustomExpDesc("x", "0.05");
        xExp.info = Localization.getUpgradeIncCustomExpInfo("x", "0.05");
        xExp.boughtOrRefunded = (_) => {
            updateC();
            theory.invalidatePrimaryEquation();
            theory.invalidateSecondaryEquation();
        }
    }

    {
        omegaExp = theory.createMilestoneUpgrade(3, 2);
        omegaExp.description = Localization.getUpgradeIncCustomExpDesc("{\\omega}", "0.05");
        omegaExp.info = Localization.getUpgradeIncCustomExpInfo("{\\omega}", "0.05");
        omegaExp.boughtOrRefunded = (_) => {
            updateC();
            theory.invalidatePrimaryEquation();
            theory.invalidateSecondaryEquation();
        }
    }

    {
        vExp = theory.createMilestoneUpgrade(4, 2);
        vExp.description = Localization.getUpgradeIncCustomExpDesc("v", "0.05");
        vExp.info = Localization.getUpgradeIncCustomExpInfo("v", "0.05");
        vExp.boughtOrRefunded = (_) => {
            updateC();
            theory.invalidatePrimaryEquation();
            theory.invalidateSecondaryEquation();
        }
    }

    {
        a1Exp = theory.createMilestoneUpgrade(5, 1);
        a1Exp.description = Localization.getUpgradeIncCustomExpDesc("a_1", "0.07");
        a1Exp.info = Localization.getUpgradeIncCustomExpInfo("a_1", "0.07");
        a1Exp.boughtOrRefunded = (_) => theory.invalidateSecondaryEquation();
    }
    
    
    /////////////////
    //// Achievements
    //achievement1 = theory.createAchievement(0, "Achievement 1", "Description 1", () => v1.level > 1);
    //achievement2 = theory.createSecretAchievement(1, "Achievement 2", "Description 2", "Maybe you should buy two levels of v2?", () => v2.level > 1);

    ///////////////////
    //// Story chapters
    chapter1 = theory.createStoryChapter(0, "Magnetic Fields Chapter 1", "Welcome to Magnetic Fields! (placeholder)", () => c1.level > 0);
    chapter2 = theory.createStoryChapter(1, "Magnetic Fields Chapter 2", "This term will be useful for you. (placeholder)", () => velocityTerm.level > 0);

    updateAvailability();
    updateC();
}

var updateAvailability = () => {
    vExp.isAvailable = velocityTerm.level > 0;

    delta.isAvailable = deltaVariable.level > 0;
    v3.isAvailable = velocityTerm.level > 0;
    v4.isAvailable = velocityTerm.level > 0;
}


var tick = (elapsedTime, multiplier) => {
    if (vx == BigNumber.ZERO) resetSimulation();
    if (c1.level == 0) return;

    let dt = BigNumber.from(elapsedTime * multiplier);
    if (debugFlag) dt *= getDebugMult(debugMultUpgrade.level);

    let bonus = theory.publicationMultiplier;
    let vc1 = getC1(c1.level);
    let vc2 = getC2(c2.level);
    let va1 = getA1(a1.level).pow(getA1exp());
    let va2 = getA2(a2.level);

    t += dt * getTdot(tvar.level);
    ts += dt * getTdot(tvar.level);
    x += dt * getTdot(tvar.level) * vx;
    
    let dI = va1 * BigNumber.from(1e-2) * (i0 - I/va2);
    I += dI.max(BigNumber.ZERO);
    I = I.min(va2*i0);
    B = mu0 * I * getDelta(delta.level);
    omega = (getQ() / getM()) * B;

    let xterm = x.pow(getXexp());
    let omegaterm = omega.pow(getOmegaexp());
    let vterm = velocityTerm.level > 0 ? vtot.pow(getVexp()) : BigNumber.ONE;

    rhodot = dt * bonus * C * vc1 * vc2 * xterm * omegaterm * vterm;
    currency.value += rhodot;

    theory.invalidateQuaternaryValues();
}

var getPrimaryEquation = () => {
    let result = ``;

    if (stage == 0)
    {
        theory.primaryEquationHeight = 85;
        theory.primaryEquationScale = velocityTerm.level > 0 ? 0.95 : 1.05;
        result += `x = {v_x}{t_s}\\\\`;
        result += `B = {{\\mu}_0}{I}{\\delta}\\\\`;
        result += `\\omega = \\frac{q}{m}{B}`;
    }
    else
    {
        theory.primaryEquationHeight = 80;
        theory.primaryEquationScale = 1.2;
        result += `\\dot{\\rho} = C{c_1}{c_2}x^{${getXexp().toNumber()}}\\omega^{${getOmegaexp().toNumber()}}`;
        if (velocityTerm.level > 0) result += `v^{${getVexp().toNumber()}}`;
    }

    return result;
}

var getSecondaryEquation = () => {
    let result = ``;

    if (stage == 0)
    {
        theory.secondaryEquationHeight = 70;
        theory.secondaryEquationScale = 1;
        result += `v_x = [{v_1}{v_2}\\times{10^{-20}}]({t_s}=0)\\\\`;
        if (velocityTerm.level > 0)
        {
            theory.secondaryEquationHeight = 100;
            theory.secondaryEquationScale = 0.9;
            result += `v_y = [{v_3}{v_4}\\times{10^{-18}}]({t_s}=0)\\times\\sin(\\omega{t})\\\\`;
            result += `v_z = [{v_3}{v_4}\\times{10^{-18}}]({t_s}=0)\\times\\cos(\\omega{t})\\\\`;
        }
        result += `\\dot{I} = \\frac{a_1}{100}\\left(10^{15} - \\frac{I}{a_2}\\right)\\\\`;
    }
    else
    {
        theory.secondaryEquationHeight = 65;
        theory.secondaryEquationScale = 1.1;
        if (velocityTerm.level > 0)
        {
            result += `v = \\sqrt{{v_x}^2+{v_y}^2+{v_z}^2}\\\\`;
        }
        result += `C = ${numberFormat(C, 2)}`;
    }

    return result;
}

var getTertiaryEquation = () => {
    let result = ``;

    if (stage == 0)
    {
        result += `m=${numberFormat(getM(),2)}`;
        if (deltaVariable.level == 0)
        {
            result += ` ,\\,{\\delta}=1`;
        }
        result += `\\\\`;
        result += `\\mu_0=4\\pi\\times{10}^{-7}`;
    }
    else
    {
        if (tauRate == 1) result = `${theory.latexSymbol}=\\max\\rho`;
        else result = `${theory.latexSymbol}=\\max\\rho^{${tauRate}}`;
    }
    
    return result;
}

var getQuaternaryEntries = () => {
    if (quaternaryEntries.length == 0)
    {
        quaternaryEntries.push(new QuaternaryEntry(null, ''));
        if (stage == 0)
        {
            quaternaryEntries.push(new QuaternaryEntry("{t_s}_{{}\\,}", null));
            quaternaryEntries.push(new QuaternaryEntry("x_{{}\\,}", null));
            quaternaryEntries.push(new QuaternaryEntry("{v_x}_{{}\\,}", null));
            quaternaryEntries.push(new QuaternaryEntry("B_{{}\\,}", null));
            quaternaryEntries.push(new QuaternaryEntry("I_{{}\\,}", null));
        }
        else
        {
            quaternaryEntries.push(new QuaternaryEntry("t_{{}\\,}", null));
            quaternaryEntries.push(new QuaternaryEntry("\\dot{\\rho}_{{}\\,}", null));
            quaternaryEntries.push(new QuaternaryEntry("x_{{}\\,}", null));
            quaternaryEntries.push(new QuaternaryEntry("\\omega_{{}\\,}", null));
            quaternaryEntries.push(new QuaternaryEntry("v_{{}\\,}", null));
        }
        quaternaryEntries.push(new QuaternaryEntry(null, ''));
    }

    if (stage == 0)
    {
        quaternaryEntries[1].value = ts.toString(2);
        quaternaryEntries[2].value = numberFormat(x, 2);
        quaternaryEntries[3].value = numberFormat(vx, 2);
        quaternaryEntries[4].value = numberFormat(B, 2);
        quaternaryEntries[5].value = numberFormat(I, 2);
    }
    else
    {
        quaternaryEntries[1].value = t.toString(2);
        quaternaryEntries[2].value = rhodot.toString(2);
        quaternaryEntries[3].value = numberFormat(x, 2);
        quaternaryEntries[4].value = numberFormat(omega, 2);
        if (velocityTerm.level == 1) {quaternaryEntries[5].value = numberFormat(vtot, 3);}
    }

    return quaternaryEntries;
}


var canGoToPreviousStage = () => stage === 1;
var goToPreviousStage = () => {
  stage--;
  theory.invalidatePrimaryEquation();
  theory.invalidateSecondaryEquation();
  theory.invalidateTertiaryEquation();
  quaternaryEntries = [];
  theory.invalidateQuaternaryValues();
};
var canGoToNextStage = () => stage === 0;
var goToNextStage = () => {
  stage++;
  theory.invalidatePrimaryEquation();
  theory.invalidateSecondaryEquation();
  theory.invalidateTertiaryEquation();
  quaternaryEntries = [];
  theory.invalidateQuaternaryValues();
};


var getPublicationMultiplier = (tau) => tau.pow(pubExponent);
var getPublicationMultiplierFormula = (symbol) => `${symbol}^{${pubExponent}}`;
var getTau = () => currency.value.pow(tauRate);
var getCurrencyFromTau = (tau) => [tau.max(BigNumber.ONE).pow(BigNumber.ONE / tauRate), currency.symbol]

var postPublish = () => {
    t = BigNumber.ZERO;
    ts = BigNumber.ZERO;
    x = BigNumber.ZERO;
    vx = BigNumber.ZERO;
    vz = BigNumber.ZERO;
    vtot = BigNumber.ZERO;
    I = BigNumber.ZERO;
    omega = BigNumber.ZERO;
    B = BigNumber.ZERO;

    theory.invalidateQuaternaryValues();
    resetSimulation();
}

var get2DGraphValue = () => currency.value.sign * (BigNumber.ONE + currency.value.abs()).log10().toNumber();

var getInternalState = () => `${x.toNumber()} ${vx.toNumber()} ${vz.toNumber()} ${vtot.toNumber()} ${I.toNumber()} ${t} ${ts}`;

var setInternalState = (state) => {
    let values = state.split(" ");
    if (values.length > 0) x = BigNumber.from(values[0]);
    if (values.length > 1) vx = BigNumber.from(values[1]);
    if (values.length > 2) vz = BigNumber.from(values[2]);
    if (values.length > 3) vtot = BigNumber.from(values[3]);
    if (values.length > 4) I = BigNumber.from(values[4]);
    if (values.length > 5) t = parseBigNumber(values[5]);
    if (values.length > 6) ts = parseBigNumber(values[6]);
  
    updateC();
  };

var getDebugMult = (level) => Utils.getStepwisePowerSum(level, 10, 9, 1);

var getTdot = (level) => BigNumber.from(0.2 + level / 20);

var getXexp = () => (BigNumber.from(3.8) + 0.05*xExp.level);
var getOmegaexp = () => (BigNumber.from(4.2) + 0.05*omegaExp.level);
var getVexp = () => (BigNumber.from(1.5) + 0.05*omegaExp.level);
var getA1exp = () => (BigNumber.ONE + a1Exp.level*0.07);

var updateC = () => {
    let m = BigNumber.from(1);
    let xinit = BigNumber.from(1e19).pow(getXexp());
    let omegainit = (defaultmass / (q0 * mu0 * i0)).pow(getOmegaexp());
    let vinit = velocityTerm.level === 1 ? BigNumber.from(1e18).pow(getVexp()) : BigNumber.ONE;

    C = m * xinit * omegainit * vinit;
}

var getQ = () => q0;
var getM = () => defaultmass;

var getC1 = (level) => Utils.getStepwisePowerSum(level, 2, 7, 0);
var getC2 = (level) => BigNumber.TWO.pow(level);
var getA1 = (level) => Utils.getStepwisePowerSum(level, 2, 5, 1);
var getA2 = (level) => BigNumber.from(1.25).pow(level);
var getDelta = (level) => deltaVariable.level > 0 ? BigNumber.from(1.1).pow(level) : BigNumber.ONE;
var getV1 = (level) => Utils.getStepwisePowerSum(level, 2, 10, 1);
var getV2 = (level) => BigNumber.from(1.3).pow(level);
var getV3 = (level) => Utils.getStepwisePowerSum(level, 2, 10, 0);
var getV4 = (level) => BigNumber.from(1.5).pow(level);


init();
