# 音效清单

> 55 个音效按系统分类，与 jsfxr 生成参数一一对应。

## 1. 战斗 - 玩家攻击（10个）

| ID | 名称 | 触发场景 | 职业 | 特征 |
|----|------|---------|------|------|
| 001 | warrior_slash | 战士挥剑 | warrior | CC0 blade 音效，真实金属剑刃 |
| 002 | warrior_hit | 战士命中 | warrior | CC0 hammer 音效，真实锤击碰撞 |
| 003 | ranger_draw | 游侠拉弓 | ranger | 弦颤音，张力感 |
| 004 | ranger_shoot | 游侠射箭 | ranger | 破空声，高频 |
| 005 | ranger_hit | 箭矢命中 | ranger | 高通穿刺，尖锐 |
| 006 | mage_cast | 法师施法 | mage | 脉冲能量，上升+颤音 |
| 007 | mage_orb_fly | 能量弹飞行 | mage | 持续嗡鸣（循环） |
| 008 | mage_hit | 能量弹命中 | mage | 能量爆裂 |
| 009 | cleric_cast | 牧师施法 | cleric | 琶音和弦，温暖神圣 |
| 010 | cleric_heal | 治疗波生效 | cleric | 治愈音阶，温暖 |

## 2. 战斗 - 敌人行为（9个）

| ID | 名称 | 触发场景 | 特征 |
|----|------|---------|------|
| 011 | enemy_basic_attack | basic/fast 攻击 | 颤音咆哮，喉音质感 |
| 012 | enemy_ghost_attack | 幽灵攻击 | 相位漂移，空灵 |
| 013 | enemy_tank_attack | tank 攻击 | 沉重撞击 |
| 014 | enemy_boss_attack | Boss 攻击 | 低频共振，威压颤音 |
| 015 | enemy_boss_special | Boss 技能 | 蓄力+释放 |
| 016 | enemy_hit | 敌人受击 | 被打反馈 |
| 017 | enemy_die_basic | 普通敌人死亡 | 消散声 |
| 018 | enemy_die_ghost | 幽灵死亡 | 相位消散，空灵 |
| 019 | enemy_die_boss | Boss 死亡 | 爆炸+胜利感 |

## 3. 玩家状态（5个）

| ID | 名称 | 触发场景 | 特征 |
|----|------|---------|------|
| 020 | player_hurt | 玩家受伤 | 低通闷击，钝痛感 |
| 021 | player_heal | 玩家被治疗 | 温暖恢复 |
| 022 | player_die | 玩家死亡 | 下降+消散 |
| 023 | player_respawn | 玩家复活 | 上升+重生感 |
| 024 | level_up | 升级 | 上升琶音，史诗 |

## 4. 技能系统（7个）

| ID | 名称 | 触发场景 | 特征 |
|----|------|---------|------|
| 025 | skill_dash | 冲刺 | 风声呼啸，清晰可听 |
| 026 | skill_shield_on | 护盾开启 | 脉冲嗡鸣，能量屏障 |
| 027 | skill_shield_off | 护盾关闭 | 能量消散 |
| 028 | skill_heal | 自我治疗 | 治愈音效 |
| 029 | skill_speed_on | 加速开启 | 相位风切，能量涌动 |
| 030 | skill_speed_off | 加速结束 | 能量衰减 |
| 031 | skill_cooldown | 技能冷却完成 | 清脆提示 |

## 5. 道具系统（6个）

| ID | 名称 | 触发场景 | 特征 |
|----|------|---------|------|
| 032 | pickup_gold | 拾取金币 | 金属共振叮响，明亮 |
| 033 | pickup_potion_hp | 拾取血瓶 | 颤音液体晃动 |
| 034 | pickup_potion_mp | 拾取蓝瓶 | 相位琶音，魔法能量 |
| 035 | pickup_key | 拾取钥匙 | 金属共振，清脆 |
| 036 | pickup_weapon | 拾取武器 | 低通厚重，有分量 |
| 037 | pickup_treasure | 拾取宝箱 | 宝箱开启，惊喜 |

## 6. 地牢系统（6个）

| ID | 名称 | 触发场景 | 特征 |
|----|------|---------|------|
| 038 | floor_transition | 楼层切换 | 下降/上升过渡 |
| 039 | door_open | 门开启 | 低频石磨嘎吱，节奏 |
| 040 | stairs_down | 下楼梯 | 重复脚步节奏 |
| 041 | ambient_drip | 环境水滴 | 长衰减回响，洞穴感 |
| 042 | ambient_chain | 环境链条 | 相位金属回荡，远距离 |
| 043 | ambient_wind | 环境风声 | 低沉持续 |

## 7. UI 系统（9个）

| ID | 名称 | 触发场景 | 特征 |
|----|------|---------|------|
| 044 | ui_click | 按钮点击 | 清脆方波 |
| 045 | ui_hover | 按钮悬停 | 柔和提示 |
| 046 | ui_select | 选择确认 | 确认音 |
| 047 | ui_back | 返回/取消 | 取消音 |
| 048 | ui_error | 错误/无法操作 | 警告音 |
| 049 | game_start | 游戏开始 | 史诗开场 |
| 050 | game_over | 游戏结束 | 悲壮结束 |
| 051 | victory | 胜利 | 欢快琶音 |
| 052 | chat_message | 收到聊天消息 | 清脆提示 |

## 8. 多人联机（3个）

| ID | 名称 | 触发场景 | 特征 |
|----|------|---------|------|
| 053 | player_join | 玩家加入 | 上升提示 |
| 054 | player_leave | 玩家离开 | 下降提示 |
| 055 | all_ready | 全员准备 | 确认和弦 |
