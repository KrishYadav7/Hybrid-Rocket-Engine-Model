// Math & Physics Functions
function computeMachFromAreaRatio(areaRatio, gamma) {
    let M = areaRatio > 10 ? 3.2 : (areaRatio > 4 ? 2.4 : 1.5);
    for(let i=0; i<70; i++) {
        const term = 1 + 0.5*(gamma-1)*M*M;
        const exponent = (gamma+1)/(2*(gamma-1));
        const factor = (2/(gamma+1))*term;
        const value = (1/M)*Math.pow(factor, exponent);
        const f = value - areaRatio;
        if(Math.abs(f)<1e-8) break;
        const dFactor_dM = (2/(gamma+1))*(gamma-1)*M;
        const dPow = exponent * Math.pow(factor, exponent-1) * dFactor_dM;
        const dValue_dM = (-1/(M*M))*Math.pow(factor, exponent) + (1/M)*dPow;
        if(dValue_dM===0) break;
        M = M - f/dValue_dM;
        M = Math.min(8.0, Math.max(0.2, M));
    }
    return M;
}

function computeThrustCoefficient(eps, gamma, Pc, Pa) {
    const Me = computeMachFromAreaRatio(eps, gamma);
    const Pe = Pc * Math.pow(1 + 0.5*(gamma-1)*Me*Me, -gamma/(gamma-1));
    const term1 = Math.sqrt((2*gamma*gamma/(gamma-1)) * Math.pow(2/(gamma+1),(gamma+1)/(gamma-1)) * (1 - Math.pow(Pe/Pc,(gamma-1)/gamma)));
    const term2 = (Pe-Pa)/Pc * eps;
    return term1 + term2;
}

function computeInstantaneous(mdot_ox, rho_f, L_m, d_port_m, a, n, dt_mm, eps, gamma, cstar, p_amb, g0) {
    const A_port = Math.PI * (d_port_m/2)*(d_port_m/2);
    const A_throat = Math.PI * Math.pow(dt_mm/2000,2);
    const Gox = mdot_ox / A_port;
    const r_dot = a * Math.pow(Gox, n);
    const S_burn = Math.PI * d_port_m * L_m;
    const mdot_fuel = r_dot * S_burn * rho_f;
    const mdot_total = mdot_ox + mdot_fuel;
    const Pc = (mdot_total * cstar) / A_throat;
    const Cf = computeThrustCoefficient(eps, gamma, Pc, p_amb);
    const thrust = Cf * A_throat * Pc;
    const Isp = thrust / (mdot_total * g0);
    return { Pc, thrust, Isp, mdot_fuel, mdot_total, Gox, r_dot, Cf, A_port, A_throat, S_burn };
}

function generateCalculationHtml(res, mdot_ox, rho_f, L_m, d_i_m, a_reg, n_reg, dt_mm, eps, gamma_val, cstar_val, p_amb_val, g0_val, avg_regression, total_fuel_consumed, exp_regression, exp_fuel_used_kg, exp_final_diam_m, vol_slpm, rho_ox_amb_gl, t_burn) {
    const A_port_m2 = res.A_port;
    const A_throat_m2 = res.A_throat;
    const Gox = res.Gox;
    const r_dot_mm = res.r_dot * 1000;
    const S_burn_m2 = res.S_burn;
    const mdot_fuel_gs = res.mdot_fuel * 1000;
    const mdot_total_gs = (mdot_ox + res.mdot_fuel) * 1000;
    const Cf = res.Cf;
    const thrust_N = res.thrust;
    const Isp_s = res.Isp;
    const Pc_bar = res.Pc / 1e5;
    const O_ratio = mdot_ox / res.mdot_fuel;
    const exp_reg_mm = exp_regression * 1000;
    const exp_fuel_g = exp_fuel_used_kg * 1000;
    const exp_port_mm = exp_final_diam_m * 1000;
    const model_port_mm = (Math.sqrt(d_i_m*d_i_m + (4*total_fuel_consumed)/(rho_f*Math.PI*L_m))) * 1000;
    const efficiency = (cstar_val / 1058) * 100; // Assuming 1058 is theo c*

    return `<table>
          <tr><td><strong>1. Oxidizer mass flow</strong>ṁₒₓ = SLPM × ρₒₓ / 60,000</td><td style="color:#fff;">${vol_slpm} × ${rho_ox_amb_gl} / 60,000 = <span style="color:#60a5fa">${(mdot_ox*1000).toFixed(2)} g/s</span></td></tr>
          <tr><td><strong>2. Port area (initial)</strong>A_port = π·(d_i/2)²</td><td style="color:#fff;">π × ${(d_i_m*1000).toFixed(1)}/2)² = <span style="color:#60a5fa">${A_port_m2.toExponential(4)} m²</span></td></tr>
          <tr><td><strong>3. Oxidizer mass flux</strong>Gₒₓ = ṁₒₓ / A_port</td><td style="color:#fff;">${mdot_ox.toFixed(5)} / ${A_port_m2.toExponential(4)} = <span style="color:#60a5fa">${Gox.toFixed(1)} kg/m²s</span></td></tr>
          <tr><td><strong>4. Regression rate</strong>ṙ = a · Gₒₓⁿ</td><td style="color:#fff;">${a_reg.toExponential(2)} × ${Gox.toFixed(1)}^${n_reg} = <span style="color:#60a5fa">${r_dot_mm.toFixed(3)} mm/s</span></td></tr>
          <tr><td><strong>5. Burning surface area</strong>A_b = π·d_i·L</td><td style="color:#fff;">π × ${(d_i_m*1000).toFixed(1)} × ${(L_m*1000).toFixed(0)} = <span style="color:#60a5fa">${S_burn_m2.toExponential(4)} m²</span></td></tr>
          <tr><td><strong>6. Fuel mass flow</strong>ṁ_f = ρ_f · ṙ · A_b</td><td style="color:#fff;">${rho_f} × ${res.r_dot.toExponential(4)} × ${S_burn_m2.toExponential(4)} = <span style="color:#60a5fa">${mdot_fuel_gs.toFixed(2)} g/s</span></td></tr>
          <tr><td><strong>7. Total mass flow</strong>ṁ_total = ṁₒₓ + ṁ_f</td><td style="color:#fff;">${(mdot_ox*1000).toFixed(2)} + ${mdot_fuel_gs.toFixed(2)} = <span style="color:#60a5fa">${mdot_total_gs.toFixed(2)} g/s</span></td></tr>
          <tr><td><strong>8. Throat area</strong>A_t = π·(d_t/2)²</td><td style="color:#fff;">π × (${dt_mm}/2)² = <span style="color:#60a5fa">${A_throat_m2.toExponential(4)} m²</span></td></tr>
          <tr><td><strong>9. Chamber pressure</strong>P_c = (ṁ_total · c*) / A_t</td><td style="color:#fff;">(${mdot_total_gs/1000} × ${cstar_val}) / ${A_throat_m2.toExponential(4)} = <span style="color:#60a5fa">${Pc_bar.toFixed(2)} bar</span></td></tr>
          <tr><td><strong>10. Thrust coefficient</strong>C_F = f(γ, ε, P_c/P_a)</td><td style="color:#fff;">γ=${gamma_val}, ε=${eps}, P_c/P_a=${(res.Pc/p_amb_val).toFixed(2)} → <span style="color:#60a5fa">${Cf.toFixed(4)}</span></td></tr>
          <tr><td><strong>11. Thrust</strong>F = C_F · A_t · P_c</td><td style="color:#fff;">${Cf.toFixed(4)} × ${A_throat_m2.toExponential(4)} × ${res.Pc.toFixed(0)} = <span style="color:#60a5fa">${thrust_N.toFixed(2)} N</span></td></tr>
          <tr><td><strong>12. Specific impulse</strong>I_sp = F / (ṁ_total · g₀)</td><td style="color:#fff;">${thrust_N.toFixed(2)} / (${mdot_total_gs/1000} × ${g0_val}) = <span style="color:#60a5fa">${Isp_s.toFixed(1)} s</span></td></tr>
          <tr><td><strong>13. Oxidizer/fuel ratio</strong>O/F = ṁₒₓ / ṁ_f</td><td style="color:#fff;">${mdot_ox.toFixed(5)} / ${res.mdot_fuel.toFixed(5)} = <span style="color:#60a5fa">${O_ratio.toFixed(3)}</span></td></tr>
          <tr><td><strong>14. Regression (Avg Model)</strong>ṙ_avg = (d_final - d_i) / 2t</td><td style="color:#fff;">(${model_port_mm.toFixed(2)} - ${(d_i_m*1000).toFixed(1)}) / (2×${t_burn}) = <span style="color:#60a5fa">${(avg_regression*1000).toFixed(3)} mm/s</span></td></tr>
          <tr><td><strong>15. Experimental Error</strong>Compared to Exp.1 data</td><td style="color:#fff;">Regression Error: <span style="color:#f87171">${((avg_regression*1000 - exp_reg_mm)/exp_reg_mm*100).toFixed(1)}%</span><br>Fuel Mass Error: <span style="color:#f87171">${((total_fuel_consumed*1000 - exp_fuel_g)/exp_fuel_g*100).toFixed(1)}%</span></td></tr>
     </table>`;
}

// Main logic
function updateAll() {
    let L_m = parseFloat(document.getElementById('L_mm').value)/1000;
    let d_i_m = parseFloat(document.getElementById('d_i_mm').value)/1000;
    let m_i_kg = parseFloat(document.getElementById('m_init_g').value)/1000;
    let m_f_kg = parseFloat(document.getElementById('m_final_g').value)/1000;
    let rho_f = parseFloat(document.getElementById('rho_fuel').value);
    let vol_slpm = parseFloat(document.getElementById('vol_flow_slpm').value);
    let rho_ox_amb_gl = parseFloat(document.getElementById('rho_ox_amb').value);
    let dt_mm = parseFloat(document.getElementById('throat_diam_mm').value);
    let t_burn = parseFloat(document.getElementById('run_time').value);
    let a_reg = parseFloat(document.getElementById('reg_a').value);
    let n_reg = parseFloat(document.getElementById('reg_n').value);
    let eps = parseFloat(document.getElementById('eps_exp').value);
    let gamma_val = parseFloat(document.getElementById('gamma').value);
    let cstar_val = parseFloat(document.getElementById('cstar').value);
    let p_amb_val = parseFloat(document.getElementById('p_amb').value);
    let g0_val = parseFloat(document.getElementById('g0').value);

    let mdot_ox = vol_slpm * rho_ox_amb_gl / 1000 / 60;
    const res_i = computeInstantaneous(mdot_ox, rho_f, L_m, d_i_m, a_reg, n_reg, dt_mm, eps, gamma_val, cstar_val, p_amb_val, g0_val);

    let d_port = d_i_m, dt = 0.05, total_fuel_consumed = 0;
    for (let t = 0; t <= t_burn; t += dt) {
        const A_port = Math.PI * (d_port / 2) * (d_port / 2);
        const Gox = mdot_ox / A_port;
        const r_dot = a_reg * Math.pow(Gox, n_reg);
        const S_burn = Math.PI * d_port * L_m;
        total_fuel_consumed += r_dot * S_burn * rho_f * dt;
        d_port += 2 * r_dot * dt;
        if (d_port > 0.2) break;
    }

    const predicted_final_port_m = d_port;
    const avg_regression = (predicted_final_port_m - d_i_m) / (2 * t_burn);
    const exp_fuel_used_kg = m_i_kg - m_f_kg;
    const exp_final_diam_m = Math.sqrt(d_i_m * d_i_m + (4 * exp_fuel_used_kg) / (rho_f * Math.PI * L_m));
    const exp_regression = (exp_final_diam_m - d_i_m) / (2 * t_burn);
    const res_steady = computeInstantaneous(mdot_ox, rho_f, L_m, d_i_m, a_reg, n_reg, dt_mm, eps, gamma_val, cstar_val, p_amb_val, g0_val);
    const Pc_bar = res_steady.Pc / 1e5;

    document.getElementById('res_pc').innerHTML = `${Pc_bar.toFixed(2)} <span style="font-size:0.6em;color:#9ca3af">bar</span>`;
    document.getElementById('res_thrust').innerHTML = `${res_steady.thrust.toFixed(1)} <span style="font-size:0.6em;color:#9ca3af">N</span>`;
    document.getElementById('res_isp').innerHTML = `${res_steady.Isp.toFixed(0)} <span style="font-size:0.6em;color:#9ca3af">s</span>`;

    document.getElementById('extra_metrics').innerHTML = `
        <span><strong>ṁₒₓ:</strong> ${(mdot_ox*1000).toFixed(2)} g/s</span>
        <span><strong>Gₒₓ:</strong> ${res_i.Gox.toFixed(1)} kg/m²s</span>
        <span><strong>ṙ₀:</strong> ${(res_i.r_dot*1000).toFixed(3)} mm/s</span>
        <span><strong>O/F:</strong> ${(mdot_ox/res_steady.mdot_fuel).toFixed(3)}</span>
    `;

    document.getElementById('comparisonTable').innerHTML = `
        <div class="comparison-item"><span><strong>PARAMETER</strong></span><span><strong>EXP.1</strong></span><span><strong>MODEL</strong></span><span><strong>ERROR</strong></span></div>
        <div class="comparison-item"><span>Regression (mm/s)</span><span>1.651</span><span style="color:#fff">${(avg_regression*1000).toFixed(3)}</span><span style="color:#f87171">${((avg_regression-0.001651)/0.001651*100).toFixed(1)}%</span></div>
        <div class="comparison-item"><span>Final port (mm)</span><span>26.51</span><span style="color:#fff">${(predicted_final_port_m*1000).toFixed(2)}</span><span style="color:#f87171">${((predicted_final_port_m-0.02651)/0.02651*100).toFixed(1)}%</span></div>
        <div class="comparison-item"><span>Pc (bar)</span><span>5.43</span><span style="color:#fff">${Pc_bar.toFixed(2)}</span><span style="color:#f87171">${((Pc_bar-5.43)/5.43*100).toFixed(1)}%</span></div>
    `;

    window._lastCalcHtml = generateCalculationHtml(res_steady, mdot_ox, rho_f, L_m, d_i_m, a_reg, n_reg, dt_mm, eps, gamma_val, cstar_val, p_amb_val, g0_val, avg_regression, total_fuel_consumed, exp_regression, exp_fuel_used_kg, exp_final_diam_m, vol_slpm, rho_ox_amb_gl, t_burn);
    window._simState = { mdot_ox, rho_f, L_m, d_i_m, a_reg, n_reg, dt_mm, eps, gamma_val, cstar_val, p_amb_val, g0_val, t_burn };

    // If the calculation box is already open, update it live
    if (document.getElementById('inlineCalcContainer').style.display === 'block') {
        document.getElementById('inlineCalcContainer').innerHTML = window._lastCalcHtml;
    }
}

// Generate Data for the New Tab
function generatePlotData() {
    if(!window._simState) return null;
    const { mdot_ox, rho_f, L_m, dt_mm, cstar_val, t_burn, a_reg, n_reg, d_i_m, eps, gamma_val, p_amb_val, g0_val } = window._simState;
    
    // Transient Data
    let transientTime = [], pcPoints = [], thrustPoints = [], mdotOxPoints = [], ofRatioPoints = [];
    let d_port = d_i_m, dt = 0.05, t = 0;
    const A_throat = Math.PI * Math.pow(dt_mm/2000, 2);
    
    while(t <= t_burn + dt/2) {
        const A_port = Math.PI * (d_port/2) * (d_port/2);
        const r_dot = a_reg * Math.pow((mdot_ox / A_port), n_reg);
        const mdot_fuel = r_dot * Math.PI * d_port * L_m * rho_f;
        const Pc = ((mdot_ox + mdot_fuel) * cstar_val) / A_throat;
        
        // Calculate transient Thrust
        const Cf = computeThrustCoefficient(eps, gamma_val, Pc, p_amb_val);
        const thrust = Cf * A_throat * Pc;

        transientTime.push(t); 
        pcPoints.push(Pc/1e5); 
        thrustPoints.push(thrust); 
        mdotOxPoints.push(mdot_ox*1000); 
        ofRatioPoints.push(mdot_ox/mdot_fuel);
        
        d_port += 2 * r_dot * dt; 
        t += dt;
        if(d_port > 0.2) break;
    }

    // Sweep Data
    const points=45; let mdot_arr=[], sweepPc=[], sweepThrust=[], sweepIsp=[], Gox_arr=[], rdot_arr=[];
    for(let i=0; i<=points; i++) { 
        let mx = 0.001 + (0.025-0.001)*(i/points); 
        try { 
            const res = computeInstantaneous(mx, rho_f, L_m, d_i_m, a_reg, n_reg, dt_mm, eps, gamma_val, cstar_val, p_amb_val, g0_val); 
            mdot_arr.push(mx); sweepPc.push(res.Pc/1e5); sweepThrust.push(res.thrust); sweepIsp.push(res.Isp); Gox_arr.push(res.Gox); rdot_arr.push(res.r_dot*1000); 
        } catch(e){} 
    }

    return { 
        transient: { time: transientTime, pc: pcPoints, thrust: thrustPoints, of: ofRatioPoints }, 
        sweep: { mdot: mdot_arr, pc: sweepPc, thrust: sweepThrust, isp: sweepIsp, gox: Gox_arr, rdot: rdot_arr },
        theory: { a: a_reg, n: n_reg }
    };
}

// The Telemetry Dashboard Logic
document.getElementById('openPlotsWindowBtn').addEventListener('click', () => {
    updateAll();
    const data = generatePlotData();
    const win = window.open('', '_blank');
    if (!win) { alert("Popup blocked. Please allow popups for this site to view the telemetry dashboard."); return; }

    win.document.write(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <title>Telemetry Dashboard | Hybrid Rocket</title>
            <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@500;700&family=Inter:wght@400;600&display=swap" rel="stylesheet">
            <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"><\/script>
            <style>
                :root { --bg: #050505; --card: #0f1115; --accent: #3b82f6; --text: #f3f4f6; }
                body { margin: 0; padding: 2rem; background: var(--bg); color: var(--text); font-family: 'Inter', sans-serif; background-image: radial-gradient(circle at 50% -10%, #172033 0%, transparent 40%); }
                .header { text-align: center; margin-bottom: 2.5rem; animation: fadeIn 0.8s ease-out; }
                .header h1 { font-family: 'Orbitron', sans-serif; font-size: 2.2rem; letter-spacing: 2px; color: #fff; margin:0; text-transform: uppercase; }
                .header p { color: #6b7280; font-size: 0.9rem; margin-top: 0.5rem; text-transform: uppercase; letter-spacing: 1px;}
                .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(500px, 1fr)); gap: 1.5rem; max-width: 1400px; margin: 0 auto; }
                .card { background: var(--card); border: 1px solid #1f2937; border-radius: 12px; padding: 1.5rem; box-shadow: 0 10px 30px rgba(0,0,0,0.5); animation: slideUp 0.6s ease-out backwards; position: relative; overflow: hidden; }
                .card::after { content: ''; position: absolute; top: 0; left: 0; width: 100%; height: 2px; background: linear-gradient(90deg, transparent, var(--accent), transparent); opacity: 0.5;}
                .card:nth-child(2) { animation-delay: 0.1s; --accent: #10b981; }
                .card:nth-child(3) { animation-delay: 0.2s; --accent: #ef4444; }
                .card:nth-child(4) { animation-delay: 0.3s; --accent: #f59e0b; }
                .card:nth-child(5) { animation-delay: 0.4s; --accent: #8b5cf6; }
                .card h2 { font-family: 'Orbitron', sans-serif; font-size: 1.1rem; margin-top: 0; color: #fff; display: flex; align-items: center; gap: 10px; border-bottom: 1px solid #1f2937; padding-bottom: 0.8rem; margin-bottom: 1rem;}
                .canvas-container { position: relative; height: 350px; width: 100%; }
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>Flight Telemetry & Predictions</h1>
                <p>Live Data Simulation Window</p>
            </div>
            <div class="grid">
                <div class="card">
                    <h2>CHAMBER PRESSURE (TRANSIENT)</h2>
                    <div class="canvas-container"><canvas id="pcPlot"></canvas></div>
                </div>
                <div class="card">
                    <h2>THRUST OVER TIME (TRANSIENT)</h2>
                    <div class="canvas-container"><canvas id="thrustTimePlot"></canvas></div>
                </div>
                <div class="card">
                    <h2>O/F RATIO SHIFT (TRANSIENT)</h2>
                    <div class="canvas-container"><canvas id="ofPlot"></canvas></div>
                </div>
                <div class="card">
                    <h2>STEADY STATE PERFORMANCE SWEEP</h2>
                    <div class="canvas-container"><canvas id="sweepPlot"></canvas></div>
                </div>
                <div class="card">
                    <h2>MARXMAN REGRESSION MAP</h2>
                    <div class="canvas-container"><canvas id="regPlot"></canvas></div>
                </div>
            </div>

            <script>
                const data = ${JSON.stringify(data)};
                Chart.defaults.color = '#9ca3af';
                Chart.defaults.font.family = 'Inter';
                
                // 1. Transient Pressure
                new Chart(document.getElementById('pcPlot'), {
                    type: 'line', data: { labels: data.transient.time.map(v=>v.toFixed(2)), datasets: [{ label: 'Pc (bar)', data: data.transient.pc, borderColor: '#3b82f6', backgroundColor: 'rgba(59,130,246,0.1)', fill: true, tension: 0.3, pointRadius: 0 }] },
                    options: { responsive: true, maintainAspectRatio: false, scales: { x: { title: { display: true, text: 'Time (s)' }, grid: { color: '#1f2937' } }, y: { title: { display: true, text: 'Pressure (bar)' }, grid: { color: '#1f2937' } } } }
                });

                // 2. Transient Thrust
                new Chart(document.getElementById('thrustTimePlot'), {
                    type: 'line', data: { labels: data.transient.time.map(v=>v.toFixed(2)), datasets: [{ label: 'Thrust (N)', data: data.transient.thrust, borderColor: '#ef4444', backgroundColor: 'rgba(239,68,68,0.1)', fill: true, tension: 0.3, pointRadius: 0 }] },
                    options: { responsive: true, maintainAspectRatio: false, scales: { x: { title: { display: true, text: 'Time (s)' }, grid: { color: '#1f2937' } }, y: { title: { display: true, text: 'Thrust (N)' }, grid: { color: '#1f2937' } } } }
                });

                // 3. O/F Shift
                new Chart(document.getElementById('ofPlot'), {
                    type: 'line', data: { labels: data.transient.time.map(v=>v.toFixed(2)), datasets: [{ label: 'O/F Ratio', data: data.transient.of, borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,0.1)', fill: true, tension: 0.3, pointRadius: 0 }] },
                    options: { responsive: true, maintainAspectRatio: false, scales: { x: { title: { display: true, text: 'Time (s)' }, grid: { color: '#1f2937' } }, y: { title: { display: true, text: 'O/F Ratio' }, grid: { color: '#1f2937' } } } }
                });

                // 4. Performance Sweep
                new Chart(document.getElementById('sweepPlot'), {
                    type: 'line', data: { labels: data.sweep.mdot.map(v=>v.toFixed(3)), datasets: [ { label: 'Pc (bar)', data: data.sweep.pc, borderColor: '#3b82f6', yAxisID: 'y', pointRadius:0 }, { label: 'Thrust (N)', data: data.sweep.thrust, borderColor: '#f59e0b', yAxisID: 'y1', pointRadius:0 } ] },
                    options: { responsive: true, maintainAspectRatio: false, scales: { x: { title: { display:true, text: 'Oxidizer Mass Flow (kg/s)' }, grid:{color:'#1f2937'} }, y: { type: 'linear', position: 'left', title: { display:true, text: 'Pressure (bar)' }, grid:{color:'#1f2937'} }, y1: { type: 'linear', position: 'right', title: { display:true, text: 'Thrust (N)' }, grid:{drawOnChartArea:false} } } }
                });

                // 5. Regression Log-Log
                const gox = data.sweep.gox.filter(v=>v>0);
                const rdot = data.sweep.rdot.filter((_,i)=>data.sweep.gox[i]>0);
                const theory = gox.map(g => (data.theory.a * Math.pow(g, data.theory.n)) * 1000);
                new Chart(document.getElementById('regPlot'), {
                    type: 'scatter', data: { datasets: [ { label: 'Predicted ṙ', data: gox.map((g,i)=>({x:g, y:rdot[i]})), borderColor: '#8b5cf6', pointRadius: 3 }, { label: 'Theory a·Gⁿ', data: gox.map((g,i)=>({x:g, y:theory[i]})), borderColor: '#fff', borderDash: [5,5], type: 'line', pointRadius: 0 } ] },
                    options: { responsive: true, maintainAspectRatio: false, scales: { x: { type: 'logarithmic', title: { display:true, text: 'Gₒₓ (kg/m²s)' }, grid:{color:'#1f2937'} }, y: { type: 'logarithmic', title: { display:true, text: 'ṙ (mm/s)' }, grid:{color:'#1f2937'} } } }
                });
            <\/script>
        </body>
        </html>
    `);
    win.document.close();
});

// Inline Calculations Toggle Logic
const toggleCalcBtn = document.getElementById('toggleCalcBtn');
const inlineCalcContainer = document.getElementById('inlineCalcContainer');

toggleCalcBtn.addEventListener('click', () => {
    if (inlineCalcContainer.style.display === 'none' || inlineCalcContainer.style.display === '') {
        inlineCalcContainer.innerHTML = window._lastCalcHtml || '<p style="text-align:center; color:#9ca3af; padding: 1rem;">Click "Compute Setup" first.</p>';
        inlineCalcContainer.style.display = 'block';
        
        toggleCalcBtn.innerHTML = '<i class="fas fa-times"></i> Hide Detailed Calculations';
        toggleCalcBtn.classList.replace('btn-outline-purple', 'btn-reset');
        toggleCalcBtn.style.color = '#ef4444';
        toggleCalcBtn.style.borderColor = 'rgba(239, 68, 68, 0.4)';
    } else {
        inlineCalcContainer.style.display = 'none';
        
        toggleCalcBtn.innerHTML = '<i class="fas fa-calculator"></i> Show Detailed Calculations';
        toggleCalcBtn.classList.replace('btn-reset', 'btn-outline-purple');
        toggleCalcBtn.style.color = '#c4b5fd';
        toggleCalcBtn.style.borderColor = 'rgba(139, 92, 246, 0.4)';
    }
});

// Main Buttons
document.getElementById('computeBtn').addEventListener('click', updateAll);
document.getElementById('runTransientBtn').addEventListener('click', updateAll);
document.getElementById('resetBtn').addEventListener('click', () => { location.reload(); });

// Initialization
window.addEventListener('DOMContentLoaded', updateAll);